function formatDate(date, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
module.exports = { formatDate };
