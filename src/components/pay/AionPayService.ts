import {TxnResponse} from "../../common/TxnResponse";

export default class AionPayService {

  private gqlUrl: string

  NONCE_QUERY: string = `
    query nonce($address: String!) {
     chainApi {
      nonce(address: $address) 
     }
     txnApi {
       nrgPrice
     }
   }`

  BALANCE_QUERY: string = `
    query nonce($address: String!) {
     chainApi {
      balance(address: $address) 
     }
    }`

  SEND_RAWTXN_QUERY: string = `
    mutation sendRawTransaction($encodedTx: String!) {
     txnApi {
        sendRawTransaction(encodedTx: $encodedTx) {
          status
          msgHash
          txHash
          txResult
          txDeploy
          error
        }
      }
    }`

  constructor(gqlUrl: string) {
    this.gqlUrl = gqlUrl
  }

  fetchNonce(address: string) {
    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.NONCE_QUERY, "variables": {"address": address}}),
    })
      .then(res => res.json())
      .then(res => {
        console.log("Nonce & NrgPrice fetched");

        let error = this.getError(res)
        if (error) { //error
          throw new Error(error)
        }

        let nonceData = ((res["data"])["chainApi"])["nonce"]

        //Get current nrgPrice
        let nrgPriceData = null
        try {
          nrgPriceData = ((res["data"])["txnApi"])["nrgPrice"]
        } catch (e) {
          console.log("Error getting current nrg price")
        }

        if (nrgPriceData) {
          let nonce = nonceData as number;

          let nrgPrice = null
          try {
            if (nrgPriceData)
              nrgPrice = nrgPriceData as number
          } catch (e) {
            //ignore. try cat is just for safer side
          }

          return [nonce, nrgPrice]
        } else {
          throw new Error("Unable to get nrgPrice")
        }
      })
  }

  fetchBalance(address) {

    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.BALANCE_QUERY, "variables": {"address": address}}),
    })
      .then(res => res.json())
      .then(res => {
        console.log("Balance fetched");

        let error = this.getError(res)
        if (error) { //error
          throw new Error(error)
        }

        let data = ((res["data"])["chainApi"])["balance"]

        if (data) {
          let balance = data as number;
          return balance
        } else
          return null
      })
  }

  sendRawTransaction(encodedTx: string) {
    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.SEND_RAWTXN_QUERY, "variables": {"encodedTx": encodedTx}}),
    })
      .then(res => res.json())
      .then(res => {

        let error = this.getError(res)
        if (error) { //error
          throw new Error(error)
        }

        let data = ((res["data"])["txnApi"])["sendRawTransaction"]

        if (data) {
          let txnResponse = data as TxnResponse

          return txnResponse
        } else
          return null

        // console.log(this.txnResponse)
        //
        // this.txnDone = true

      })
      // .catch(reason => {
      //   this.txnDone = true
      //   this.isError = true
      //   this.errors.push("Error sending the transaction")
      //   this.errors.push("[Reason] " + reason)
      //   throw new Error(reason)
      // })
  }
  getError(res) {
    let errors = this._getErrors(res)

    if (errors.length > 0) { //error

      let errorMsg = ''
      errors.forEach(
        e => errorMsg += e + ", "
      )
      return errorMsg
    } else
      return null
  }

  _getErrors(res) {
    let errors = res["errors"] as object[]

    if (errors && errors.length > 0) {
      return errors.map(error => error["message"]);
    } else
      return [];
  }
}
