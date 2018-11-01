import {Component, Prop, State} from '@stencil/core';
import {TransactionUtil} from "../../common/TransactionUtil";
import {Transaction} from "../../common/Transaction";
import {TxnResponse} from "../../common/TxnResponse";
import {Constant} from "../../common/Constant";
import {SignedTransaction} from "../../common/SignedTransaction";

@Component({
  tag: 'aion-pay',
  styleUrl: 'aion-pay.scss',
  shadow: true
})
export class AionPay {

  @Prop() to: string;

  // @Prop() from: string;

  @Prop() gqlUrl: string;

  @State() unlockBy: string = "private_key"

  @State() visible: boolean = false

  @State() txnInProgress: boolean = false

  @State() txnDone: boolean = false

  @State() showConfirm: boolean = false

  @State() from: string

  @State() _to: string

  @State() value: number

  @State() privateKey: string

  @State() gas: number

  @State() gasPrice: number

  @State() encodedTxn: SignedTransaction

  @State() txnResponse: TxnResponse = new TxnResponse()

  amount: number

  NONCE_QUERY: string =  `
    query nonce($address: String!) {
     chainApi {
      nonce(address: $address) 
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

  constructor() {
    this.handleHidePaymentDialog = this.handleHidePaymentDialog.bind(this)
    this.handleShowPaymentDialog = this.handleShowPaymentDialog.bind(this)
    this.handleHideTransactionInprogressDialog = this.handleHideTransactionInprogressDialog.bind(this)
    this.handleCloseConfirmDialog = this.handleCloseConfirmDialog.bind(this)
    this.handleResetData = this.handleResetData.bind(this)

    this.signPayment = this.signPayment.bind(this)
    this.confirmPayment = this.confirmPayment.bind(this)

    this.handleUnlockBy = this.handleUnlockBy.bind(this)
    this.handleFromInput = this.handleFromInput.bind(this)
    this.handleToInput = this.handleToInput.bind(this)
    this.handleValueInput = this.handleValueInput.bind(this)
    this.handlePrivateKeyInput = this.handlePrivateKeyInput.bind(this)
    this.handleDerivePublicKey = this.handleDerivePublicKey.bind(this)
    this.submitRawTransansaction = this.submitRawTransansaction.bind(this)
  }


  componentDidLoad() {
    if(this.to)
      this._to = this.to
  }

  handleShowPaymentDialog() {
    this.visible = true
  }

  handleHidePaymentDialog() {
    this.visible = false
    this.handleResetData()
  }

  handleHideTransactionInprogressDialog() {
    this.txnInProgress = false
    this.txnDone = false
    this.visible = false
    this.handleResetData()
  }

  handleCloseConfirmDialog() {
    this.showConfirm = false
    this.handleResetData()
  }

  handleResetData() {
    this.txnInProgress = false
    this.txnDone = false
    this.visible = false

    this.from = ''
    this.value = 0
    this.privateKey = ''
    this.gas = 0
    this.gasPrice = 0

    this.resetTxnResponse()
  }

  private resetTxnResponse() {
    this.txnResponse.txHash = ''
    this.txnResponse.msgHash = ''
    this.txnResponse.error = ''
    this.txnResponse.txResult = ''
    this.txnResponse.status = ''
  }

  handleUnlockBy(event) {
    this.unlockBy = event.target.value;
  }

  handleToInput(event) {
    this._to = event.target.value;

    if (event.target.validity.typeMismatch) {
      console.log('this element is not valid')
    }
  }

  handleFromInput(event) {
    this.from = event.target.value;

    if (event.target.validity.typeMismatch) {
      console.log('this element is not valid')
    }
  }

  handleValueInput(event) {
    this.value = event.target.value;

    if (event.target.validity.typeMismatch) {
      console.log('this element is not valid')
    }
  }

  handlePrivateKeyInput(event) {
    this.privateKey = event.target.value

    if (event.target.validity.typeMismatch) {
      console.log('this element is not valid')
    }
  }

  handleDerivePublicKey() {
    let publicKey = TransactionUtil.getAddress(this.privateKey)

    if(publicKey)
      this.from = publicKey
  }

  async signPayment(e) {
    e.preventDefault()
    this.amount = this.value * Math.pow(10, 18)

    let txn = new Transaction()
    txn.to = this._to

    txn.value = this.amount

    txn.nonce = await this.fetchNonce()

    console.log("Fetching current nonce " + txn.nonce)

    this.encodedTxn = TransactionUtil.signTransaction(txn, this.privateKey)
    this.encodedTxn.input.from = this.from

    this.showConfirm = true
    this.visible = false

    console.log(this.encodedTxn)

  }

  async confirmPayment() {
    this.showConfirm = false
    this.submitRawTransansaction(this.encodedTxn.rawTransaction)
  }

  fetchNonce() {
    return fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.NONCE_QUERY, "variables": {"address": this.from}}),
    })
      .then(res => res.json())
      .then(res => {
        console.log("Nonce fetched");
        let nonce = ((res["data"])["chainApi"])["nonce"] as number;
        return nonce
      })
  }

  submitRawTransansaction(encodedTx) {

    this.txnInProgress = true
    this.txnDone = false

    try {
      return fetch(this.gqlUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"query": this.SEND_RAWTXN_QUERY, "variables": {"encodedTx": encodedTx}}),
      })
        .then(res => res.json())
        .then(res => {

          this.txnResponse = ((res["data"])["txnApi"])["sendRawTransaction"] as TxnResponse

          console.log(this.txnResponse)

          this.txnDone = true

        });
    } catch(error) {
      // this.txnInProgress = false
      this.txnDone = true
      throw error
    }
  }


  render() {
    return (
      <div class="u-text o-panel-container">

        {this.visible?
          <div>
            <div aria-hidden class="c-overlay c-overlay--visible"></div>
            <div role="dialog" class="o-modal o-modal--visible">
              <div class="c-card">
                <header class="c-card__header">
                  <button type="button" class="c-button c-button--close"
                          onClick={this.handleHidePaymentDialog}>&times;</button>
                  <div class="aion-heading">
                    <img src={Constant.aion_logo} class="aion-image"></img>
                    <h2 class="c-heading"> Transfer AION</h2>
                  </div>
                </header>

                <div class="c-card__body">
                  <fieldset class="o-fieldset aion-unlock">
                    <legend class="o-fieldset__legend">Unlock using</legend>
                    <div class="o-grid o-grid--demo u-small">
                      <div class="o-grid__cell">
                        <div class="o-grid-text">
                          <label class="c-field c-field--choice">
                            <input type="radio" name="unlock_by" value="private_key"
                                   checked={this.unlockBy === 'private_key'}
                                   onInput={(event) => this.handleUnlockBy(event)}></input>
                            &nbsp;Private Key
                          </label>
                        </div>
                      </div>
                      <div class="o-grid__cell" >
                        <div class="o-grid-text">
                          <label class="c-field c-field--choice">
                            <input type="radio" name="unlock_by" value="keystore"
                                   checked={this.unlockBy === 'keystore'}
                                   onInput={(event) => this.handleUnlockBy(event)}
                                   disabled
                            >
                            </input>
                            &nbsp;Keystore File
                          </label>
                        </div>
                      </div>
                      <div class="o-grid__cell">
                        <div class="o-grid-text">
                          <label class="c-field c-field--choice">
                            <input type="radio" name="unlock_by" value="ledger"
                                   checked={this.unlockBy === 'ledger'}
                                   onInput={(event) => this.handleUnlockBy(event)}
                                   disabled
                            >
                            </input>
                            &nbsp;Ledger
                          </label>
                        </div>
                      </div>
                    </div>

                  </fieldset>
                  <fieldset class="o-fieldset">

                    {this.unlockBy == 'private_key' ?
                      <div class="o-form-element">
                        <label class="c-label" htmlFor="private_key">Private Key</label>
                        <input id="private_key" placeholder="Private Key" class="c-field" value={this.privateKey}
                               type="password"
                               onInput={(e) => this.handlePrivateKeyInput(e)}
                               onBlur={this.handleDerivePublicKey}
                        />
                      </div>:null
                    }

                    {this.unlockBy == 'keystore' ?
                      <div class="o-form-element">
                        <label class="c-label" htmlFor="private_key">Not supported yet.</label>
                      </div>:null
                    }

                    {this.unlockBy == 'ledger' ?
                      <div class="o-form-element">
                        <label class="c-label" htmlFor="private_key">Not supported yet.</label>
                      </div>:null
                    }

                    <div class="o-form-element">
                      <label class="c-label" htmlFor="from">From</label>
                      <input id="from" placeholder="From Address" class="c-field" value={this.from} onInput={(e) => this.handleFromInput(e)}
                             readonly="true" disabled/>
                    </div>

                    <div class="o-form-element">
                      <label class="c-label" htmlFor="to">To</label>
                      <input id="to" placeholder="To Address" class="c-field" value={this._to}/>
                    </div>

                    <div class="o-form-element">
                      <label class="c-label" htmlFor="value">Amount</label>
                      <input id="value" placeholder="Enter amount" class="c-field" value={this.value}
                             type="number"
                             onInput={this.handleValueInput}/>
                    </div>
                  </fieldset>
                </div>

                <footer class="c-card__footer">
                  <button type="button" class="c-button c-button--brand" onClick={this.signPayment}>Send</button>&nbsp;
                  <button type="button" class="c-button c-button--brand" onClick={this.handleHidePaymentDialog}>Close
                  </button>
                </footer>
              </div>
            </div>
          </div> : <div></div>
        }

        {this.txnInProgress ?
          <div>
            <div aria-hidden class="c-overlay c-overlay--visible"></div>
            <div role="dialog" class="o-modal o-modal--visible">
              <div class="c-card">
                <header class="c-card__header">
                  <button type="button" class="c-button c-button--close"
                          onClick={this.handleHideTransactionInprogressDialog}>&times;</button>
                  <h2 class="c-heading">Sending AION</h2>
                </header>

                <div class="c-card__body">
                  {!this.txnDone ?
                    <div><i class="fa fa-spinner fa-spin"></i> &nbsp; <i>Sending transaction. Please wait ...</i></div>:
                    <div>
                      Transaction Hash: <a href={Constant.explorer_base_url + "transaction/" + this.txnResponse.txHash} target="_blank">{this.txnResponse.txHash}</a>
                    </div>
                  }
                </div>

                <footer class="c-card__footer">
                  <button type="button" class="c-button c-button--brand" onClick={this.handleHideTransactionInprogressDialog}>Close
                  </button>
                </footer>
              </div>
            </div>
          </div> : <div></div>
        }

        {this.showConfirm ?
          <div>
            <div aria-hidden class="c-overlay c-overlay--visible"></div>
            <div role="dialog" class="o-modal o-modal--visible">
              <div class="c-card">
                <header class="c-card__header">
                  <button type="button" class="c-button c-button--close"
                          onClick={this.handleCloseConfirmDialog}>&times;</button>
                  <h2 class="c-heading">Confirm Transaction</h2>
                </header>

                <div class="c-card__body">
                  <div>
                    From: {this.encodedTxn.input.from}
                  </div>
                  <div>
                    To: {this.encodedTxn.input.to}
                  </div>
                  <div>
                    Value: {this.encodedTxn.input.value / Math.pow(10, 18)}
                  </div>
                  <div>
                    Gas: {this.encodedTxn.input.gas}
                  </div>
                  <div>
                    Gas Price: {this.encodedTxn.input.gasPrice}
                  </div>
                  <div>
                  Raw Txn: {this.encodedTxn.rawTransaction}
                  </div>
                </div>

                <footer class="c-card__footer">
                  <button type="button" class="c-button c-button--brand" onClick={this.confirmPayment}>Confirm
                  </button>
                </footer>
              </div>
            </div>
          </div> : <div></div>
        }

        <button type="button" class="c-button pay-button .u-high" onClick={this.handleShowPaymentDialog}>
          <slot>
            Pay By <img src={Constant.aion_logo} class="img-valign"></img>
          </slot>
        </button>
      </div>

    );
  }
}
