import {TxnResponse} from "../../common/TxnResponse";
import {Transaction} from "../../common/Transaction";

export default class AionPayService {

  private gqlUrl: string

  NONCE_NRG_QUERY: string = `
    query nonceAndNrg($address: String!, $txArgs:  TxArgsInput!) {
     chainApi {
      nonce(address: $address) 
     }
     txnApi {
       estimateNrgByTxArgs(txArgs: $txArgs)
     }
   }`

  BALANCE_QUERY: string = `
    query nonce($address: String!) {
     chainApi {
      balance(address: $address) 
     }
     txnApi {
      nrgPrice
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

  fetchNonceNrg(address: string, txn: Transaction) {

    //For estimateNrg call
    let txArgs = {
      to: txn.to,
      from: address,
      value: txn.value,
      data: txn.data,
    }

    console.log(txArgs)

    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.NONCE_NRG_QUERY, "variables": {"address": address, "txArgs": txArgs}}),
    })
      .then(res => res.json())
      .then(res => {
        console.log("Nonce & NrgPrice fetched");

        let error = this.getError(res)
        if (error) { //error
          throw new Error(error)
        }

        let nonceData = ((res["data"])["chainApi"])["nonce"]

        let estimatedNrg = null
        try {
          estimatedNrg = ((res["data"])["txnApi"])["estimateNrgByTxArgs"] as number
        } catch (e) {
          console.log("Error getting estimated energy")
        }

        try {
          let nonce = nonceData as number;

          return [nonce, estimatedNrg]
        } catch (e) {
          console.log(e)
          throw new Error("Unable to get nonce or estimated nrg")
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

        //also check nrgPrice
        let nrgPriceData = null
        try {
          nrgPriceData = ((res["data"])["txnApi"])["nrgPrice"]
        } catch (e) {
          console.log("Error getting current nrg price")
        }

        console.log("Nrg price fetched is " + nrgPriceData)

        if (data) {
          let balance = data as number

          if(nrgPriceData)
            nrgPriceData = nrgPriceData as number

          return [balance, nrgPriceData]
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
