// Единый формат цены: целые рубли с разделителем тысяч — «1 682 ₽»
export const fmtPrice = (price: number): string =>
  `${Math.round(price).toLocaleString('ru-RU')} ₽`
