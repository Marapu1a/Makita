import nodemailer from 'nodemailer'

// Уведомление о новом заказе на почту менеджера. Учётные данные — своя же
// почта makita-snab@mail.ru как отправитель и получатель (SMTP_USER == получатель
// по умолчанию, но ORDER_NOTIFY_EMAIL можно переопределить отдельно).
// Если SMTP не настроен или упал — заказ всё равно создаётся (решение владельца),
// сюда прилетает только логирование, вызывающий код ошибку не пробрасывает.

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
  transportCompany?: string | null
  city?: string | null
  street?: string | null
  house?: string | null
  apartment?: string | null
  comment?: string | null
  totalPrice: number
  items: OrderNotificationItem[]
}

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ₽`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function buildHtml(order: OrderNotificationData): string {
  const address = [order.city, order.street && `ул. ${order.street}`, order.house && `д. ${order.house}`, order.apartment && `кв. ${order.apartment}`]
    .filter(Boolean)
    .join(', ')

  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;font-family:monospace">${esc(it.partNumber)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd">${esc(it.name || 'Без названия')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:center">${it.quantity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap">${fmtPrice(it.price)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap">${fmtPrice(it.price * it.quantity)}</td>
      </tr>`
    )
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:640px">
      <h2 style="margin:0 0 4px">Заказ #${order.id} — ${esc(order.name)}</h2>
      <p style="color:#666;margin:0 0 16px">makita-remont.ru</p>

      <table style="margin-bottom:16px">
        <tr><td style="padding:2px 10px 2px 0;color:#666">Телефон</td><td>${esc(order.phone)}</td></tr>
        <tr><td style="padding:2px 10px 2px 0;color:#666">Email</td><td>${esc(order.email)}</td></tr>
        <tr><td style="padding:2px 10px 2px 0;color:#666">Доставка</td><td>${esc(order.deliveryLabel)}</td></tr>
        ${order.transportCompany ? `<tr><td style="padding:2px 10px 2px 0;color:#666">ТК</td><td>${esc(order.transportCompany)}</td></tr>` : ''}
        ${address ? `<tr><td style="padding:2px 10px 2px 0;color:#666">Адрес</td><td>${esc(address)}</td></tr>` : ''}
        ${order.comment ? `<tr><td style="padding:2px 10px 2px 0;color:#666">Комментарий</td><td>${esc(order.comment)}</td></tr>` : ''}
      </table>

      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#666">
            <th style="padding:6px 10px;border-bottom:2px solid #111">Артикул</th>
            <th style="padding:6px 10px;border-bottom:2px solid #111">Название</th>
            <th style="padding:6px 10px;border-bottom:2px solid #111;text-align:center">Кол-во</th>
            <th style="padding:6px 10px;border-bottom:2px solid #111;text-align:right">Цена</th>
            <th style="padding:6px 10px;border-bottom:2px solid #111;text-align:right">Сумма</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="text-align:right;font-size:16px;font-weight:bold;margin-top:12px">
        Итого: ${fmtPrice(order.totalPrice)}
      </p>
    </div>
  `
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
    subject: `Новый заказ #${order.id} — ${order.name}`,
    html: buildHtml(order),
  })
  console.log(`[mailer] письмо о заказе #${order.id} отправлено на ${to}`)
}
