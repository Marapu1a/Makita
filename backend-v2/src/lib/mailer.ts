import nodemailer from 'nodemailer'
import {
  PREPAYMENT_THRESHOLD,
  getDeliveryZoneLabel,
  getOrderPricing,
} from './orderPricing.js'

// Уведомления о новом заказе менеджеру и покупателю. Учётные данные — почта
// магазина; SMTP_USER используется как отправитель и как адрес менеджера
// по умолчанию, но ORDER_NOTIFY_EMAIL / ORDER_REPLY_EMAIL можно переопределить.
// Если SMTP не настроен или упал — заказ всё равно создаётся (решение владельца),
// а вызывающий код логирует сбой каждой отправки отдельно.

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null

  const port = parseInt(SMTP_PORT || '465')
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  return transporter
}

export interface OrderNotificationItem {
  partNumber: string
  name: string | null
  quantity: number
  price: number
}

export interface OrderNotificationData {
  id: number
  name: string
  phone: string
  email: string
  deliveryLabel: string
  deliveryZone?: string | null
  deliveryCost?: number | null
  transportCompany?: string | null
  city?: string | null
  street?: string | null
  house?: string | null
  apartment?: string | null
  comment?: string | null
  itemsTotal: number
  items: OrderNotificationItem[]
}

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ₽`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escMultiline = (s: string) => esc(s).replace(/\r?\n/g, '<br>')

function getAddress(order: OrderNotificationData): string {
  return [
    order.city,
    order.street && `ул. ${order.street}`,
    order.house && `д. ${order.house}`,
    order.apartment && `кв. ${order.apartment}`,
  ]
    .filter(Boolean)
    .join(', ')
}

function buildDeliveryDetailsHtml(order: OrderNotificationData): string {
  const zone = getDeliveryZoneLabel(order.deliveryZone)
  const isRegion = order.deliveryLabel === 'Отправка в регион' || order.deliveryLabel === 'Отправка в другой город'
  return `
    ${zone ? `<div style="margin-bottom:5px"><strong>Зона доставки:</strong> ${esc(zone)}</div>` : ''}
    ${
      order.deliveryZone === 'OUTSIDE_MKAD'
        ? '<div style="margin-bottom:5px"><strong>Доплата за МКАД:</strong> 50 ₽/км, расстояние и сумму рассчитает менеджер</div>'
        : ''
    }
    ${
      isRegion
        ? '<div style="margin-bottom:5px"><strong>Стоимость доставки:</strong> рассчитает менеджер после звонка</div>'
        : ''
    }
  `
}

function buildTotalsHtml(order: OrderNotificationData): string {
  const pricing = getOrderPricing(
    order.itemsTotal,
    order.deliveryLabel,
    order.deliveryZone,
    order.deliveryCost
  )
  const isRegion = order.deliveryLabel === 'Отправка в регион' || order.deliveryLabel === 'Отправка в другой город'
  return `
    <div style="margin:14px 0 20px;text-align:right;line-height:1.7">
      <div>Товары: <strong>${fmtPrice(pricing.itemsTotal)}</strong></div>
      ${
        pricing.deliveryCost !== null && pricing.deliveryCost > 0
          ? `<div>Доставка: <strong>${fmtPrice(pricing.deliveryCost)}</strong></div>`
          : ''
      }
      ${
        order.deliveryZone === 'OUTSIDE_MKAD'
          ? '<div>Доплата за МКАД: <strong>рассчитает менеджер (50 ₽/км)</strong></div>'
          : ''
      }
      ${
        isRegion
          ? '<div>Доставка: <strong>рассчитает менеджер после звонка</strong></div>'
          : ''
      }
      <div style="font-size:18px;font-weight:bold;margin-top:5px">
        ${pricing.finalTotalKnown ? 'Итого' : 'Известная сумма'}: ${fmtPrice(pricing.knownTotal)}
      </div>
    </div>
  `
}

function buildTermsHtml(order: OrderNotificationData): string {
  return `
    <div style="margin:18px 0;padding:12px 14px;background:#fff8e5;border-left:4px solid #d49b00">
      <div><strong>Срок поставки запчастей — 2–5 рабочих дней.</strong></div>
      ${
        order.itemsTotal >= PREPAYMENT_THRESHOLD
          ? '<div style="margin-top:6px">При сумме заказа от 2 000 ₽ может потребоваться предоплата. Необходимость и размер предоплаты сообщит менеджер при подтверждении заказа.</div>'
          : ''
      }
    </div>
  `
}

function buildTotalsText(order: OrderNotificationData): string[] {
  const pricing = getOrderPricing(
    order.itemsTotal,
    order.deliveryLabel,
    order.deliveryZone,
    order.deliveryCost
  )
  const isRegion = order.deliveryLabel === 'Отправка в регион' || order.deliveryLabel === 'Отправка в другой город'
  return [
    `Товары: ${fmtPrice(pricing.itemsTotal)}`,
    pricing.deliveryCost !== null && pricing.deliveryCost > 0
      ? `Доставка: ${fmtPrice(pricing.deliveryCost)}`
      : null,
    order.deliveryZone === 'OUTSIDE_MKAD'
      ? 'Доплата за МКАД: рассчитает менеджер (50 ₽/км)'
      : null,
    isRegion
      ? 'Доставка: рассчитает менеджер после звонка'
      : null,
    `${pricing.finalTotalKnown ? 'Итого' : 'Известная сумма'}: ${fmtPrice(pricing.knownTotal)}`,
  ].filter((line): line is string => Boolean(line))
}

function buildItemsHtml(order: OrderNotificationData): string {
  return order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 7px;border-bottom:1px solid #ddd;font-family:monospace;vertical-align:top">${esc(it.partNumber)}</td>
        <td style="padding:8px 7px;border-bottom:1px solid #ddd;vertical-align:top">${esc(it.name || 'Без названия')}</td>
        <td style="padding:8px 7px;border-bottom:1px solid #ddd;text-align:center;vertical-align:top">${it.quantity}</td>
        <td style="padding:8px 7px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap;vertical-align:top">${fmtPrice(it.price)}</td>
        <td style="padding:8px 7px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap;vertical-align:top">${fmtPrice(it.price * it.quantity)}</td>
      </tr>`
    )
    .join('')
}

function buildItemsTable(order: OrderNotificationData): string {
  return `
    <table role="presentation" style="border-collapse:collapse;width:100%">
      <thead>
        <tr style="text-align:left;font-size:11px;text-transform:uppercase;color:#666">
          <th style="padding:7px;border-bottom:2px solid #111">Артикул</th>
          <th style="padding:7px;border-bottom:2px solid #111">Название</th>
          <th style="padding:7px;border-bottom:2px solid #111;text-align:center">Кол-во</th>
          <th style="padding:7px;border-bottom:2px solid #111;text-align:right">Цена</th>
          <th style="padding:7px;border-bottom:2px solid #111;text-align:right">Сумма</th>
        </tr>
      </thead>
      <tbody>${buildItemsHtml(order)}</tbody>
    </table>
  `
}

function buildManagerHtml(order: OrderNotificationData): string {
  const address = getAddress(order)

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:640px">
      <h2 style="margin:0 0 4px">Заказ #${order.id} — ${esc(order.name)}</h2>
      <p style="color:#666;margin:0 0 16px">makita-remont.ru</p>

      <table style="margin-bottom:16px">
        <tr><td style="padding:2px 10px 2px 0;color:#666">Телефон</td><td>${esc(order.phone)}</td></tr>
        <tr><td style="padding:2px 10px 2px 0;color:#666">Email</td><td>${esc(order.email)}</td></tr>
        <tr><td style="padding:2px 10px 2px 0;color:#666">Доставка</td><td>${esc(order.deliveryLabel)}</td></tr>
        ${order.deliveryZone ? `<tr><td style="padding:2px 10px 2px 0;color:#666">Зона</td><td>${esc(getDeliveryZoneLabel(order.deliveryZone) || order.deliveryZone)}</td></tr>` : ''}
        ${order.transportCompany ? `<tr><td style="padding:2px 10px 2px 0;color:#666">ТК</td><td>${esc(order.transportCompany)}</td></tr>` : ''}
        ${address ? `<tr><td style="padding:2px 10px 2px 0;color:#666">Адрес</td><td>${esc(address)}</td></tr>` : ''}
        ${order.comment ? `<tr><td style="padding:2px 10px 2px 0;color:#666;vertical-align:top">Комментарий</td><td>${escMultiline(order.comment)}</td></tr>` : ''}
      </table>

      ${buildItemsTable(order)}
      ${buildTotalsHtml(order)}
      ${buildTermsHtml(order)}
    </div>
  `
}

function buildCustomerHtml(order: OrderNotificationData): string {
  const address = getAddress(order)

  return `
    <div style="margin:0;background:#f4f4f4;padding:24px 12px">
      <div style="box-sizing:border-box;max-width:680px;margin:0 auto;background:#fff;border-top:5px solid #008290;padding:28px 24px;font-family:Arial,sans-serif;font-size:14px;line-height:1.45;color:#111">
        <h1 style="margin:0 0 8px;font-size:22px">Заказ #${order.id} получен</h1>
        <p style="margin:0 0 20px;color:#555">Здравствуйте, ${esc(order.name)}!</p>
        <p style="margin:0 0 20px">
          Мы получили ваш заказ на makita-remont.ru. Менеджер проверит наличие и свяжется с вами для подтверждения заказа и условий получения.
        </p>

        <div style="margin:0 0 22px;padding:14px 16px;background:#f5f8f8;border-left:4px solid #008290">
          <div style="margin-bottom:5px"><strong>Способ получения:</strong> ${esc(order.deliveryLabel)}</div>
          ${buildDeliveryDetailsHtml(order)}
          ${order.transportCompany ? `<div style="margin-bottom:5px"><strong>Транспортная компания:</strong> ${esc(order.transportCompany)}</div>` : ''}
          ${address ? `<div style="margin-bottom:5px"><strong>Адрес:</strong> ${esc(address)}</div>` : ''}
          <div style="margin-bottom:5px"><strong>Получатель:</strong> ${esc(order.name)}</div>
          <div style="margin-bottom:5px"><strong>Телефон:</strong> ${esc(order.phone)}</div>
          <div><strong>Email:</strong> ${esc(order.email)}</div>
          ${order.comment ? `<div style="margin-top:10px"><strong>Комментарий:</strong><br>${escMultiline(order.comment)}</div>` : ''}
        </div>

        ${buildItemsTable(order)}
        ${buildTotalsHtml(order)}
        ${buildTermsHtml(order)}

        <p style="margin:0 0 8px">Если потребуется уточнить заказ, просто ответьте на это письмо.</p>
        <p style="margin:0;color:#777;font-size:12px">
          Это автоматическое подтверждение получения заказа, а не подтверждение оплаты или резервирования товара.
        </p>
      </div>
    </div>
  `
}

function buildCustomerText(order: OrderNotificationData): string {
  const address = getAddress(order)
  const details = [
    `Способ получения: ${order.deliveryLabel}`,
    order.deliveryZone ? `Зона доставки: ${getDeliveryZoneLabel(order.deliveryZone)}` : null,
    order.deliveryZone === 'OUTSIDE_MKAD'
      ? 'Доплата за МКАД: 50 ₽/км, расстояние и сумму рассчитает менеджер'
      : null,
    order.deliveryLabel === 'Отправка в регион' || order.deliveryLabel === 'Отправка в другой город'
      ? 'Стоимость доставки: рассчитает менеджер после звонка'
      : null,
    order.transportCompany ? `Транспортная компания: ${order.transportCompany}` : null,
    address ? `Адрес: ${address}` : null,
    `Получатель: ${order.name}`,
    `Телефон: ${order.phone}`,
    `Email: ${order.email}`,
    order.comment ? `Комментарий: ${order.comment}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  const items = order.items
    .map((it) => `${it.partNumber} — ${it.name || 'Без названия'}; ${it.quantity} × ${fmtPrice(it.price)} = ${fmtPrice(it.price * it.quantity)}`)
    .join('\n')

  return [
    `Здравствуйте, ${order.name}!`,
    '',
    `Мы получили ваш заказ #${order.id} на makita-remont.ru.`,
    'Менеджер проверит наличие и свяжется с вами для подтверждения заказа и условий получения.',
    '',
    details,
    '',
    'Состав заказа:',
    items,
    '',
    ...buildTotalsText(order),
    '',
    'Срок поставки запчастей — 2–5 рабочих дней.',
    order.itemsTotal >= PREPAYMENT_THRESHOLD
      ? 'При сумме заказа от 2 000 ₽ может потребоваться предоплата. Необходимость и размер предоплаты сообщит менеджер при подтверждении заказа.'
      : null,
    '',
    'Если потребуется уточнить заказ, просто ответьте на это письмо.',
    'Это автоматическое подтверждение получения заказа, а не подтверждение оплаты или резервирования товара.',
  ].join('\n')
}

export async function sendOrderNotification(order: OrderNotificationData): Promise<void> {
  const t = getTransporter()
  if (!t) {
    console.warn('[mailer] SMTP не настроен (SMTP_HOST/SMTP_USER/SMTP_PASS) — письмо о заказе не отправлено')
    return
  }
  const to = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER!

  await t.sendMail({
    from: `"makita-remont.ru" <${process.env.SMTP_USER}>`,
    to,
    subject: `Новый заказ #${order.id} — ${order.name.replace(/[\r\n]+/g, ' ')}`,
    html: buildManagerHtml(order),
  })
  console.log(`[mailer] письмо о заказе #${order.id} отправлено на ${to}`)
}

export async function sendCustomerOrderConfirmation(order: OrderNotificationData): Promise<void> {
  const t = getTransporter()
  if (!t) {
    console.warn('[mailer] SMTP не настроен (SMTP_HOST/SMTP_USER/SMTP_PASS) — письмо покупателю не отправлено')
    return
  }
  const replyTo = process.env.ORDER_REPLY_EMAIL || process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER!

  await t.sendMail({
    from: `"Makita-Remont" <${process.env.SMTP_USER}>`,
    to: order.email,
    replyTo,
    subject: `Заказ #${order.id} получен — makita-remont.ru`,
    text: buildCustomerText(order),
    html: buildCustomerHtml(order),
  })
  console.log(`[mailer] подтверждение заказа #${order.id} отправлено покупателю`)
}
