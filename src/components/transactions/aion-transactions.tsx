import {Component, Listen, Prop, State} from '@stencil/core';
import {AionTransactionsService} from "./AionTransactionsService";

@Component({
  tag: 'aion-transactions',
  styleUrl: 'aion-transactions.scss',
  shadow: true
})
export class AionTransactions {

  @Prop() gqlUrl: string

  @State() transactions = [];

  @State() noStorageSupport: boolean

  @State() service: AionTransactionsService

  @State() blockTimerInitialized: boolean

  @State() latestBlock: number

  noOfBlocksToConfirm: number = 10

  stopTimer: boolean = false

  timer = null

  constructor() {

  }

  componentDidLoad() {

    if (typeof(Storage) !== "undefined") {
      // Code for localStorage/sessionStorage.
    } else {
      this.noStorageSupport = true
      alert("No storage support")
    }

    this.service = new AionTransactionsService(this.gqlUrl)

    // @ts-ignore
    let aionTransactions = sessionStorage.aion_transactions;

    if(aionTransactions) {
      this.transactions = JSON.parse(aionTransactions)
    } else {
      this.transactions = []
    }

    this.service.fetchLatestBlockNumber()
      .then(blkNo => this.latestBlock = blkNo)
  }

  @Listen('body:TXN_COMPLETED')
  async handleTxnCompleted(ev) {
    let payload = ev.detail

    console.log(JSON.stringify(payload))
    if(payload) {
      let txHash = payload.data.txHash

      let transaction = await this.service.fetchTransaction(txHash)
      //alert(JSON.stringify(transaction))
      this.transactions = [... this.transactions, transaction]

      // @ts-ignore
      sessionStorage.setItem("aion_transactions", JSON.stringify(this.transactions))

      //start block timer

      let me = this;

      this.timer = setInterval(() => {
        if(!me.stopTimer) {

          //update in sessionStorage
          // @ts-ignore
          sessionStorage.setItem("aion_transactions", JSON.stringify(this.transactions))

          me.service.fetchLatestBlockNumber()
            .then(blkNo => {
              me.latestBlock = blkNo

              let txHashes = me.transactions.filter(txn => txn.confirmed? false: true)
                .map(txn => txn.txHash)

              console.log("getting status for: " + JSON.stringify(txHashes))

              if(txHashes.length == 0) {
                console.log("Stop the timer. No transaction for confirmation.")
                me.stopTimer = true
              } else {
                console.log("Checking txn status")
                this._checkTxnStatus(txHash, me)
              }

            })
        } else
          clearTimeout(me.timer)

      }, 10 * 1000);

    }

    console.log(this.transactions)
  }

  // @ts-ignore
  private _checkTxnStatus(txHashes, thisRef) {
      thisRef.service.fetchTransactions(txHashes)
        .then(txs => {

          txs.forEach(tx => {
           console.log(thisRef.latestBlock - Number(tx.blockNumber))
            if (thisRef.latestBlock - Number(tx.blockNumber) > thisRef.noOfBlocksToConfirm) {
              thisRef.transactions.forEach( transaction => {
                if(transaction.txHash.equals(tx.txHash)) {
                  transaction.confirmed = true
                  console.log("Txn confirmed" + tx.txHash)
                }
              })
            }
          })

        })
        .catch(_ => {
          console.error("Error getting txn for txnHashes: " + JSON.stringify(txHashes))
        })

  }

  render() {
    return (
     <div>
       Aion Transaction

       {this.latestBlock}
       {this.transactions.map(txn =>
         <div>
           {txn.txHash}  -  {this.latestBlock - txn.blockNumber}  - {txn.confirmed}
         </div>
       )}

     </div>

    );
  }
}
