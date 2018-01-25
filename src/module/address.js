const addAnAddress = (session, data) => {
  if (typeof session.userData.address === 'undefined') {
    session.userData.address = []
  }
  session.userData.address.push(data)
}

const getAddresses = (session) => {
  if (typeof session.userData.address === 'undefined') {
    session.userData.address = []
  }
  
  return [...new Set(session.userData.address.filter(n => n))]
}


module.exports = {
  addAnAddress,
  getAddresses
}