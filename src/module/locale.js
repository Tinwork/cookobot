const setLocale = (session, lang) => {
  session.preferredLocale(lang, err => {
    if (!err) {
      return true
    } else {
      session.error(err)
    }
  })
}

module.exports = {
  setLocale
}