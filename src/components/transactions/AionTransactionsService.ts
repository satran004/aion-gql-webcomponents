export class AionTransactionsService {

  private gqlUrl: string

  GET_TRANSCTION_QUERY = `
    query get_transaction($txHash: String!) {
      txnApi {
        transaction(txHash: $txHash) {
          blockNumber
          from
          to
          value
          txHash
        }
      }
    }
  `

  GET_MULTI_TRANSCTIONS_QUERY = `
    query get_transactionsByHash($txHash: [String]!) {
      txnApi {
        transactionsByHash(txHash: $txHash) {
          blockNumber
          from
          to
          value
          txHash
        }
      }
    }
  `

  GET_LATEST_BLOCK = `
    query latest_block {
        chainApi {
          blockNumber
        }
    }
  `

  constructor(gqlUrl: string) {
    this.gqlUrl = gqlUrl
  }

  public fetchTransaction(txnHash: string) {
    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.GET_TRANSCTION_QUERY, "variables": {"txHash": txnHash}}),
    })
      .then(res => res.json())
      .then(res => {

        let transaction = ((res["data"])["txnApi"])["transaction"] as Transaction

        transaction.confirmed = false
        return transaction
      });
  }

  public fetchTransactions(txnHash: string[]) {
    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.GET_MULTI_TRANSCTIONS_QUERY, "variables": {"txHash": txnHash}}),
    })
      .then(res => res.json())
      .then(res => {

        let transactions = ((res["data"])["txnApi"])["transactionsByHash"] as [Transaction]

        transactions.forEach(transaction => transaction.confirmed = false)
        return transactions
      });
  }

  public fetchLatestBlockNumber() {
    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.GET_LATEST_BLOCK, "variables": {}}),
    })
      .then(res => res.json())
      .then(res => {

        let blkNumber = ((res["data"])["chainApi"])["blockNumber"] as number;
        return blkNumber
      });
  }

}

export class Transaction {
  from: string
  to: string
  value: number
  blockNumber: string
  txHash: string
  confirmed: boolean = false
}
