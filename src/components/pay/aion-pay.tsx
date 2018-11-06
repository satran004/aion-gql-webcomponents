import '../../global/global.js'

import {Component, Prop, State} from '@stencil/core';
import {Constant} from "../../common/Constant";
import {TransactionUtil} from "../../common/TransactionUtil";
import {Transaction} from "../../common/Transaction";
import {TxnResponse} from "../../common/TxnResponse";
import {SignedTransaction} from "../../common/SignedTransaction";
import {CryptoUtil} from "../../common/CryptoUtil";
import {KeyStoreUtil} from "../../common/KeyStoreUtil";

@Component({
  tag: 'aion-pay',
  styleUrl: 'aion-pay.scss',
  shadow: true
})
export class AionPay {

  @Prop() to: string

  @Prop() gqlUrl: string

  @Prop() buttonText: string

  default_button_text: string = "Pay"

  to_readonly: boolean = false

  @State() unlockBy: string = "private_key"

  @State() visible: boolean = false

  @State() txnInProgress: boolean = false

  @State() txnDone: boolean = false

  @State() showConfirm: boolean = false

  @State() isError: boolean = false

  @State() errors: string[] = [];

  @State() from: string

  @State() fromBalance: number

  @State() _to: string

  @State() value: number

  @State() privateKey: string

  keystore: any
  @State() keystore_password: string //only for keystore based access
  @State() keystoreLoadingPercentage: number = 0

  @State() gas: number

  @State() gasPrice: number

  @State() encodedTxn: SignedTransaction

  @State() txnResponse: TxnResponse = new TxnResponse()

  amount: number

  BALANCE_QUERY: string = `
    query nonce($address: String!) {
     chainApi {
      balance(address: $address) 
     }
    }`

  NONCE_QUERY: string = `
    query nonce($address: String!) {
     chainApi {
      nonce(address: $address) 
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

  constructor() {
    this.handleHidePaymentDialog = this.handleHidePaymentDialog.bind(this)
    this.handleShowPaymentDialog = this.handleShowPaymentDialog.bind(this)
    this.handleHideTransactionInprogressDialog = this.handleHideTransactionInprogressDialog.bind(this)
    this.handleCloseConfirmDialog = this.handleCloseConfirmDialog.bind(this)
    this.handleHideError = this.handleHideError.bind(this)
    this.handleResetData = this.handleResetData.bind(this)

    this.signPayment = this.signPayment.bind(this)
    this.confirmPayment = this.confirmPayment.bind(this)

    this.handleUnlockBy = this.handleUnlockBy.bind(this)
    this.handleFromInput = this.handleFromInput.bind(this)
    this.handleToInput = this.handleToInput.bind(this)
    this.handleValueInput = this.handleValueInput.bind(this)
    this.handlePrivateKeyInput = this.handlePrivateKeyInput.bind(this)
    this.handleKeyStoreFileSelected = this.handleKeyStoreFileSelected.bind(this)
    this.handleKeystorePasswordInput = this.handleKeystorePasswordInput.bind(this)
    this.handleUnlockKeystore = this.handleUnlockKeystore.bind(this)

    this.handleDerivePublicKey = this.handleDerivePublicKey.bind(this)
    this.submitRawTransansaction = this.submitRawTransansaction.bind(this)

  }


  componentWillLoad() {
    if (this.to)
      this._to = this.to.toLowerCase()

    if(this.to)
      this.to_readonly = true
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

  handleHideError() {
    this.isError = false
    this.errors.length = 0
  }

  handleResetData() {
    this.txnInProgress = false
    this.txnDone = false
    this.visible = false

    this.resetFromAddressData()
    this.value = 0
    this.gas = 0
    this.gasPrice = 0

    //sensitive info. keystore loading

    this.resetTxnResponse()
  }

  private resetFromAddressData() {
    this.from = ''
    this.fromBalance = null
    this.privateKey = ''

    this.privateKey = ''
    this.keystore_password = ''
    this.keystore = null
    this.keystoreLoadingPercentage = 0
  }

  private resetTxnResponse() {
    this.txnResponse.txHash = ''
    this.txnResponse.msgHash = ''
    this.txnResponse.error = ''
    this.txnResponse.txResult = ''
    this.txnResponse.status = ''
  }

  handleUnlockBy(event) {
    let oldValue = this.unlockBy
    this.unlockBy = event.target.value

    if(oldValue != this.unlockBy) //Only reset if it's a different selection
      this.resetFromAddressData()
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

    //If private key field is empty. just return. It will be checked again while sending the transaction.
    if(!this.privateKey || this.privateKey.trim().length == 0)
      return

    try {
      this.handleHideError()
      let address = TransactionUtil.getAddress(this.privateKey)

      if (address)
        this.from = address

      this.fetchBalance(this.from, (balance) => {
        this.fromBalance = CryptoUtil.convertnAmpBalanceToAION(balance);
      })
    } catch (error) {
      console.log(error)
      this.from = ''
      this.fromBalance = null
      this.isError = true
      this.errors.push("Public Key derivation failed: " + error.toString())
      throw error
    }
  }

  /** For keystore unlock mode **/
  handleKeyStoreFileSelected(event) {
    this.resetFromAddressData()
    this.keystore = event.srcElement.files[0]
  }

  handleKeystorePasswordInput(event) {
    this.keystore_password = event.target.value;
  }

  handleUnlockKeystore() {

    let reader = new FileReader()

    try {
      reader.readAsArrayBuffer(this.keystore)
    } catch (error) {
      console.error("Error loading keystore file" + error)
      this.isError = true
      this.errors.push("Invalid keystore file. " + error.toString())
    }

    let me = this;
    reader.onload = function () {
      let content = reader.result;

      me.handleHideError()

      KeyStoreUtil.unlock(content as ArrayBuffer, me.keystore_password, (progress) => {
        me.keystoreLoadingPercentage = Math.round(progress)
      }, (_address, privateKey) => {
        me.privateKey = privateKey
        me.handleDerivePublicKey()
      }, (error) => {
        console.log("Error in opening keystore fie. " + error)
        me.isError = true
        me.errors.push("Could not open the keystore file. " + error.toString())
      });
    }
  }

  /** keystore unlock mode ends here **/

  validateInput() {

    this.handleHideError()

    if (isNaN(this.value)) {
      this.isError = true
      this.errors.push("Amount is not valid")
    }

    if (!this.privateKey || this.privateKey.trim().length == 0) {
      this.isError = true

      if(this.unlockBy == 'private_key')
        this.errors.push("Private key can not be empty")
      else if(this.unlockBy == 'keystore')
        this.errors.push("Please provide a keystore file and unlock it")
    }

    if (!this._to || this._to.trim().length == 0) {
      this.isError = true
      this.errors.push("To address can not be empty")
    }

    return !this.isError
  }

  async signPayment(e) {
    e.preventDefault()

    if (!this.validateInput()) {
      console.log('not a valid input')
      return
    }

    console.log("All valid input")

    if (!this._to) {
      this.handleDerivePublicKey()
    }

    console.log("lets do signing first..")
    this.amount = CryptoUtil.convertAIONTonAmpBalance(this.value)

    let txn = new Transaction()
    txn.to = this._to

    txn.value = this.amount

    let retVal = await this.fetchNonce()

    txn.nonce = retVal[0]
    if(retVal[1])
      txn.gasPrice = retVal[1]

    console.log("Fetching current nonce " + txn.nonce)

    try {
      this.encodedTxn = TransactionUtil.signTransaction(txn, this.privateKey)
    } catch (error) {
      console.log(error)
      this.isError = true
      this.errors.push("Error in signing transaction. Please refresh and try again")
      this.errors.push("[Reason] " + error)
      throw error
    }

    this.encodedTxn.input.from = this.from

    this.showConfirm = true
    this.visible = false

    console.log(this.encodedTxn)

  }

  async confirmPayment() {
    this.showConfirm = false
    this.submitRawTransansaction(this.encodedTxn.rawTransaction)
  }

  fetchBalance(address, callback) {
    try {
      return fetch(this.gqlUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"query": this.BALANCE_QUERY, "variables": {"address": address}}),
      })
        .then(res => res.json())
        .then(res => {
          console.log("Balance fetched");

          let data = ((res["data"])["chainApi"])["balance"]

          if (data) {
            let balance = data as number;
            callback(balance)
            return balance
          } else {
            this._parseErrorFromGQLResponse(res)
          }

        })
        .catch(reason => {
          this.isError = true
          this.errors.push("Error getting balance for the address")
          this.errors.push("[Reason] " + reason)
          throw new Error(reason)
        })
    } catch (error) {
      this.isError = true
      this.errors.push("Error getting balance for the account. Please close the dialog and try again")
      console.log(error)
      throw error
    }
  }

  fetchNonce() {
    try {
      return fetch(this.gqlUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"query": this.NONCE_QUERY, "variables": {"address": this.from}}),
      })
        .then(res => res.json())
        .then(res => {
          console.log("Nonce & NrgPrice fetched");

          let nonceData = ((res["data"])["chainApi"])["nonce"]

          //Get current nrgPrice
          let nrgPriceData = null
          try {
            nrgPriceData = ((res["data"])["txnApi"])["nrgPrice"]
          } catch (e) {
            console.log("Error getting current nrg price")
          }

          if (nonceData) {
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
            this._parseErrorFromGQLResponse(res)
          }

        })
        .catch(reason => {
          this.isError = true
          this.errors.push("Error to get nonce for the address")
          this.errors.push("[Reason] " + reason)
          throw new Error(reason)
        })
    } catch (error) {
      this.isError = true
      this.errors.push("Error getting nonce for the account. Please close the dialog and try again")
      console.log(error)
      throw error
    }
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

          let data = ((res["data"])["txnApi"])["sendRawTransaction"]

          if (data)
            this.txnResponse = data as TxnResponse
          else { //error
            this._parseErrorFromGQLResponse(res)
          }

          console.log(this.txnResponse)

          this.txnDone = true

        })
        .catch(reason => {
          this.txnDone = true
          this.isError = true
          this.errors.push("Error sending the transaction")
          this.errors.push("[Reason] " + reason)
          throw new Error(reason)
        })
    } catch (error) {
      this.txnDone = true
      this.isError = true
      this.errors.push("Error sending the transaction. Please check in the blockchain explorer and try again.")
      console.log(error)
      throw error
    }
  }

  _parseErrorFromGQLResponse(res) {
    let errors = res["errors"] as object[]

    if (errors && errors.length > 0) {
      this.isError = true
      this.errors.push((errors[0])["message"])
    }
  }

  renderError() {

    return (
      <div class="error">
        {this.isError ?
          <div role="alert" class="c-alert c-alert--warning">
            <button class="c-button c-button--close" onClick={this.handleHideError}>&times;</button>
            <ul>
              {this.errors.map((msg) => <li>{msg}</li>)}
            </ul>
          </div> : null
        }
      </div>
    );
  }

  renderUnlockOptions() {

    return (
      <div>
        {this.unlockBy == 'private_key' ?
          <div class="o-form-element">
            <label class="c-label" htmlFor="private_key">Private Key</label>
            <input id="private_key" placeholder="Private Key" class="c-field" value={this.privateKey}
                   type="password"
                   onInput={(e) => this.handlePrivateKeyInput(e)}
                   onBlur={this.handleDerivePublicKey}
            />
          </div> : null
        }

        {this.unlockBy == 'keystore' ?
          this._renderUnlockByKeystore() : null
        }

        {this.unlockBy == 'ledger' ?
          <div class="o-form-element">
            <label class="c-label" htmlFor="private_key">Not supported yet.</label>
          </div> : null
        }
      </div>
    )
  }

  _renderUnlockByKeystore() {
    var ks_unlock_progressStyle = {
      width: this.keystoreLoadingPercentage + '%',
    };

    // var inProgress = this.keystoreLoadingPercentage && this.keystoreLoadingPercentage != 0 && this.keystoreLoadingPercentage != 100

    return (
      <div class="o-form-element keystore-input">
        <div class="c-input-group">
          <div class="o-field">
            <label class="c-label" htmlFor="private_key">Key Store File</label>
            <input id="file-upload"
                   type="file"
                   accept="*"
                   onChange={(e) => this.handleKeyStoreFileSelected(e)}>
            </input>
          </div>
          <div class="o-field">
            <label class="c-label" htmlFor="keystore_password">Passowrd</label>
            <input id="keystore_password"
                   type="password"
                   class="c-field"
                   value={this.keystore_password}
                   onInput={this.handleKeystorePasswordInput}
            ></input>
          </div>
          <div class="o-field">
            <label class="c-label" htmlFor="unlock_button">&nbsp;</label>
            <button name="unlock_button" type="button"
                    class="c-button c-button--success"
                    onClick={this.handleUnlockKeystore}

            >Unlock
            </button>
          </div>
        </div>

        {this.keystoreLoadingPercentage && this.keystoreLoadingPercentage != 0 && this.keystoreLoadingPercentage != 100 ?
          <div role="dialog" class="o-modal o-modal o-modal--visible">
            <div class="c-card">
              <header class="c-card__header">
                <h2 class="c-heading">Unlocking Keystore ...</h2>
              </header>

              <div class="c-card__body">
                <div class="c-progress u-xsmall">
                  <div role="progressbar" aria-valuetext={this.keystoreLoadingPercentage + "% complete"}
                       aria-valuenow={this.keystoreLoadingPercentage} aria-valuemin="0"
                       aria-valuemax="100"
                       style={ks_unlock_progressStyle}
                       class="c-progress__bar">
                    {this.keystoreLoadingPercentage + "%"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          : null
        }

      </div>
    )
  }

  renderInputForm() {
    return (

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

            {this.renderError()}

            <div class="c-card__body o-panel scrolling-container">

              <fieldset class="o-fieldset aion-unlock">
                <legend class="o-fieldset__legend">Unlock using</legend>
                <div class="o-grid o-grid--demo u-small">
                  <div class="o-grid__cell">
                    <div class="o-grid-text">
                      <label class="c-field c-field--choice">
                        <input type="radio" name="unlock_by" value="private_key"
                               checked={this.unlockBy === 'private_key'}
                               onClick={(event) => this.handleUnlockBy(event)}></input>
                        &nbsp;Private Key
                      </label>
                    </div>
                  </div>
                  <div class="o-grid__cell">
                    <div class="o-grid-text">
                      <label class="c-field c-field--choice">
                        <input type="radio" name="unlock_by" value="keystore"
                               checked={this.unlockBy === 'keystore'}
                               onClick={(event) => this.handleUnlockBy(event)}
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
                               onClick={(event) => this.handleUnlockBy(event)}
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

                {this.renderUnlockOptions()}

                <div class="o-form-element">
                  <label class="c-label" htmlFor="from">From</label>
                  <input id="from" placeholder="From Address" class="c-field" value={this.from}
                         onInput={(e) => this.handleFromInput(e)}
                         readOnly={true} disabled/>
                  {this.fromBalance ?
                    <label class="u-xsmall from-balance">Balance: {this.fromBalance} AION</label> : null
                  }
                </div>

                <div class="o-form-element">
                  <label class="c-label" htmlFor="to">To</label>
                  <input id="to" placeholder="To Address"
                         class="c-field" value={this._to}
                         onInput={this.handleToInput}
                         readonly={this.to_readonly}
                  />
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
              <button type="button" class="c-button c-button--success" onClick={this.signPayment}>Send</button>
              &nbsp;
              <button type="button" class="c-button c-button" onClick={this.handleHidePaymentDialog}>Close
              </button>
            </footer>
          </div>
        </div>
      </div>
    )
  }

  renderTxnInProgress() {
    return (
      <div>
        <div aria-hidden class="c-overlay c-overlay--visible"></div>
        <div role="dialog" class="o-modal o-modal--visible">
          <div class="c-card">
            <header class="c-card__header">
              <button type="button" class="c-button c-button--close"
                      onClick={this.handleHideTransactionInprogressDialog}>&times;</button>
              <div class="aion-heading">
                <img src={Constant.aion_logo} class="aion-image"></img>
                <h2 class="c-heading"> Sending AION</h2>
              </div>
            </header>

            {this.renderError()}

            <div class="c-card__body">
              {!this.txnDone ?
                <div><div class="loader">Loading ...</div> &nbsp; <i>Sending transaction and waiting for at least one block confirmation. Please wait ...</i>
                </div> :
                <div>
                  {this.txnResponse.txHash ?
                    <span>
                        Transaction Hash: <a
                      href={Constant.explorer_base_url + "transaction/" + this.txnResponse.txHash}
                      target="_blank">{this.txnResponse.txHash}</a>
                        </span> : <span>Transaction could not be completed</span>
                  }
                </div>
              }
            </div>

            <footer class="c-card__footer">
              <button type="button" class="c-button c-button"
                      onClick={this.handleHideTransactionInprogressDialog}>Close
              </button>
            </footer>
          </div>
        </div>
      </div>
    )
  }

  renderShowConfirmation() {
    return (
      <div>
        <div aria-hidden class="c-overlay c-overlay--visible"></div>
        <div role="dialog" class="o-modal o-modal--visible">
          <div class="c-card">
            <header class="c-card__header">
              <button type="button" class="c-button c-button--close"
                      onClick={this.handleCloseConfirmDialog}>&times;</button>
              <div class="aion-heading">
                <img src={Constant.aion_logo} class="aion-image"></img>
                <h2 class="c-heading"> Confirm Transaction</h2>
              </div>
            </header>

            {this.renderError()}

            <div class="c-card__body confirm-dialog">
              <div class="o-grid">
                <div class="o-grid__cell o-grid__cell--width-10">
                  <div class="o-grid-text">From</div>
                </div>
                <div class="o-grid__cell">
                  <div class="o-grid-text">{this.encodedTxn.input.from}</div>
                </div>
              </div>
              <div class="o-grid">
                <div class="o-grid__cell o-grid__cell--width-10">
                  <div class="o-grid-text">To</div>
                </div>
                <div class="o-grid__cell">
                  <div class="o-grid-text">{this.encodedTxn.input.to}</div>
                </div>
              </div>

              <div class="o-grid">
                <div class="o-grid__cell o-grid__cell--width-10">
                  <div class="o-grid-text">Value</div>
                </div>
                <div class="o-grid__cell">
                  <div
                    class="o-grid-text balance">{CryptoUtil.convertnAmpBalanceToAION(this.encodedTxn.input.value)} AION
                  </div>
                </div>
              </div>

              <div class="o-grid">
                <div class="o-grid__cell o-grid__cell--width-10">
                  <div class="o-grid-text">Nrg</div>
                </div>
                <div class="o-grid__cell">
                  <div class="o-grid-text">{this.encodedTxn.input.gas}</div>
                </div>
              </div>

              <div class="o-grid">
                <div class="o-grid__cell o-grid__cell--width-10">
                  <div class="o-grid-text">Nrg Price</div>
                </div>
                <div class="o-grid__cell">
                  <div class="o-grid-text">{this.encodedTxn.input.gasPrice}</div>
                </div>
              </div>

              <div class="o-grid">
                <div class="o-grid__cell o-grid__cell--width-10">
                  <div class="o-grid-text">Raw Transaction</div>
                </div>
                <div class="o-grid__cell">
                  <div class="o-grid-text">
                    <textarea class="c-field" rows={7} readonly={true}>{this.encodedTxn.rawTransaction}</textarea>
                  </div>
                </div>
              </div>
            </div>

            <footer class="c-card__footer">
              <button type="button" class="c-button c-button--success" onClick={this.confirmPayment}>Confirm
              </button>
            </footer>
          </div>
        </div>
      </div>
    )
  }


  render() {
    return (
      <div class="u-text u-small o-panel-container">

        {this.visible ?
          this.renderInputForm() : null
        }

        {this.txnInProgress ?
          this.renderTxnInProgress() : <div></div>
        }

        {this.showConfirm ?
          this.renderShowConfirmation() : null
        }

        <button type="button" class="c-button pay-button .u-high" onClick={this.handleShowPaymentDialog}>
          <slot>
            <span class="pay-button-text">
              <img src={Constant.aion_logo} class="img-valign"></img>
              {this.buttonText? this.buttonText: this.default_button_text}
            </span>
          </slot>
        </button>
      </div>

    );
  }
}
