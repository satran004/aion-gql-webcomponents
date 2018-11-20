import '../../global/global.js'

import {Component, Method, Prop, State} from '@stencil/core';
import { Event, EventEmitter } from '@stencil/core';
import {Constant} from "../../common/Constant";
import {Transaction} from "../../common/Transaction";
import {TxnResponse} from "../../common/TxnResponse";
import {SignedTransaction} from "../../common/SignedTransaction";
import {CryptoUtil} from "../../providers/util/CryptoUtil";
import {LedgerProvider} from "../../providers/impl/ledger/LedgerProvider";
import PrivateKeyWalletProvider from "../../providers/impl/PrivateKeyWalletProvider";
import {WalletProvider} from "../../providers/WalletProvider";
import KeystoreWalletProvider from "../../providers/impl/KeystoreWalletProvider";
import AionPayService from "./AionPayService";
import {TransactionUtil} from "../../providers/util/TransactionUtil";

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

  //When to attribute is mentioned
  to_readonly: boolean = false

  //When all input fields are passed from outside. Exp: showWithData()
  readonly: boolean = false

  //It's passed dynamically from outside. Same is returned through events.
  // So that consumer can match with response.
  refId: string

  @State() unlockBy: string = "ledger"

  @State() visible: boolean = false

  @State() inputDialogEnable: boolean = false

  @State() txnInProgress: boolean = false

  @State() txnDone: boolean = false

  @State() showConfirm: boolean = false

  @State() isNotification: boolean = false
  @State() notification: string

  @State() isError: boolean = false

  @State() errors: string[] = [];

  @State() from: string

  @State() fromBalance: number

  @State() _to: string

  @State() value: number

  @State() message: string

  @State() privateKey: string

  keystore: any
  @State() keystore_password: string //only for keystore based access
  @State() keystoreLoadingPercentage: number = 0

  @State() gas: number = TransactionUtil.defaultNrgLimit //default value

  @State() gasPrice = TransactionUtil.defaultNrgPrice

  @State() encodedTxn: SignedTransaction

  @State() txnResponse: TxnResponse = new TxnResponse()

  //Events ----
  @Event({
    eventName: 'TXN_COMPLETED'
  }) transactionCompleted: EventEmitter

  @Event({
    eventName: 'TXN_INPROGRESS'
  }) transactionInProgress: EventEmitter

  @Event({
    eventName: 'TXN_FAILED'
  }) transactionFailed: EventEmitter
  //Events -----

  provider: WalletProvider

  service: AionPayService

  amount: number

  constructor() {

    this.handleHidePaymentDialog = this.handleHidePaymentDialog.bind(this)
    this.handleShowPaymentDialog = this.handleShowPaymentDialog.bind(this)
    this.handleHideTransactionInprogressDialog = this.handleHideTransactionInprogressDialog.bind(this)
    this.handleCloseConfirmDialog = this.handleCloseConfirmDialog.bind(this)
    this.handleHideError = this.handleHideError.bind(this)
    this.handleHideNotification = this.handleHideNotification.bind(this)
    this.handleResetData = this.handleResetData.bind(this)

    this.handleShowInputDialog = this.handleShowInputDialog.bind(this)
    this.handleHideInputDialog = this.handleHideInputDialog.bind(this)

    this.signPayment = this.signPayment.bind(this)
    this.confirmPayment = this.confirmPayment.bind(this)

    this.handleUnlockBy = this.handleUnlockBy.bind(this)
    this.handleFromInput = this.handleFromInput.bind(this)
    this.handleToInput = this.handleToInput.bind(this)
    this.handleValueInput = this.handleValueInput.bind(this)
    this.handleNrgInput = this.handleNrgInput.bind(this)
    this.handleNrgPriceInput = this.handleNrgPriceInput.bind(this)
    this.handleMessageInput = this.handleMessageInput.bind(this)
    this.handlePrivateKeyInput = this.handlePrivateKeyInput.bind(this)
    this.handleKeyStoreFileSelected = this.handleKeyStoreFileSelected.bind(this)
    this.handleKeystorePasswordInput = this.handleKeystorePasswordInput.bind(this)
    this.handleUnlockKeystore = this.handleUnlockKeystore.bind(this)

    this.handleDerivePublicKey = this.handleDerivePublicKey.bind(this)
    this.submitRawTransansaction = this.submitRawTransansaction.bind(this)

    this.handleLedgerConnect = this.handleLedgerConnect.bind(this)

  }

  componentWillLoad() {
    if (this.to)
      this._to = this.to.toLowerCase()

    if (this.to)
      this.to_readonly = true

    //initialize service
    this.service = new AionPayService(this.gqlUrl)
  }

  @Method()
  refreshAndShow() {
    this.handleResetData()
    this.handleShowPaymentDialog()
  }

  @Method()
  showWithData(refId: string, to: string, value: number, data: string) {
    this.handleResetData()

    this._to = to
    this.value = value
    this.message = data

    this.readonly = true
    this.refId = refId;

    this.handleShowPaymentDialog()
  }

  //1st step wallet provider
  handleShowPaymentDialog() {
    this.visible = true
  }

  handleHidePaymentDialog() {
    this.visible = false
    this.inputDialogEnable = false
    this.handleResetData()
  }

  //2nd step in wizard
  handleShowInputDialog() {//step 2

    if(!this.from) {
      this.isError = true
      this.errors.push("Please select a wallet provider and unlock it.")
      return
    }

    this.visible = false
    this.inputDialogEnable = true
  }

  handleHideInputDialog() {
    this.inputDialogEnable = false
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

  handleHideNotification() {
    this.isNotification = false
    this.notification = null
  }

  handleResetData() {
    //dialog state
    this.txnInProgress = false
    this.showConfirm = false
    this.txnDone = false
    this.visible = false

    //sender state
    this.resetFromAddressData()

    //txn state
    if(!this.to_readonly) { //only reset when not set through props
      //this.to = ''
      this._to = ''
    }

    this.value = 0
    this.message = ''
    this.gas = TransactionUtil.defaultNrgLimit
    this.gasPrice = TransactionUtil.defaultNrgPrice

    //error state
    this.isError = false
    this.errors.length = 0

    this.isNotification = false
    this.notification = ''

    //response state
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

    if (oldValue != this.unlockBy) //Only reset if it's a different selection
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

  handleNrgInput(event) {
    this.gas = event.target.value;
  }

  handleNrgPriceInput(event) {
    this.gasPrice = event.target.value;
  }

  handleMessageInput(event) {
    this.message = event.target.value;

    //Fix: Ledger txn fails for longer message
    if(this.unlockBy == 'ledger') {
      if(this.message.length > 50) {
        if(!this.isError) {
          this.isError = true
          this.errors.length = 0
          this.errors.push("Please keep your message within 50 characters while using ledger. Or, your transaction may fail.")
        }
      } else {
        if(this.isError) {
          this.isError = false
          this.errors.length = 0
        }
      }
    }
  }

  handlePrivateKeyInput(event) {
    this.privateKey = event.target.value

    if (event.target.validity.typeMismatch) {
      console.log('this element is not valid')
    }
  }

  async handleDerivePublicKey() {
    //If private key field is empty. just return. It will be checked again while sending the transaction.
    if (!this.privateKey || this.privateKey.trim().length == 0)
      return

    try {
      this.handleHideError()

      this.provider = null
      this.provider = new PrivateKeyWalletProvider(this.privateKey)

      let [address] = await this.provider.unlock(null)


      if (address)
        this.from = address

      this.updateBalance()

    } catch (error) {
      console.log(error)
      this.from = ''
      this.fromBalance = null
      this.isError = true
      this.errors.push("Public Key derivation failed: " + error.toString())
      throw error
    }
  }

  async updateBalance() {

    try {
      let [balance, nrgPrice] = await this.service.fetchBalance(this.from)

      if (balance)
        this.fromBalance = CryptoUtil.convertnAmpBalanceToAION(balance)

     if(nrgPrice)
       this.gasPrice = nrgPrice

    } catch (error) {
      this.isError = true
      this.errors.push("Error getting balance for the address")
      this.errors.push("[Reason] " + error)
      return
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

  async handleUnlockKeystore() {

    let reader = new FileReader()

    try {
      reader.readAsArrayBuffer(this.keystore)
    } catch (error) {
      console.error("Error loading keystore file" + error)
      this.isError = true
      this.errors.push("Invalid keystore file. " + error.toString())
    }

    let me = this;
    reader.onload = async function () {
      let content = reader.result;

      me.handleHideError()

      me.provider = new KeystoreWalletProvider(content, me.keystore_password)

      try {
        let [address] = await me.provider.unlock((progress: number) => {
          me.keystoreLoadingPercentage = Math.round(progress)
        })

        me.from = address

        me.updateBalance()
      } catch (error) {
        console.log("Error in opening keystore fie. " + error)
        me.isError = true
        me.errors.push("Could not open the keystore file. " + error.toString())
      }

      // KeyStoreUtil.unlock(content as ArrayBuffer, me.keystore_password, (progress) => {
      //   me.keystoreLoadingPercentage = Math.round(progress)
      // }, (_address, privateKey) => {
      //   me.privateKey = privateKey
      //   me.handleDerivePublicKey()
      // }, (error) => {
      //   console.log("Error in opening keystore fie. " + error)
      //   me.isError = true
      //   me.errors.push("Could not open the keystore file. " + error.toString())
      // });
    }
  }

  /** keystore unlock mode ends here **/

  /*** Ledger starts **/

  async handleLedgerConnect() {

    this.provider = new LedgerProvider()
    try {

      let [address] = await this.provider.unlock(null)

      this.from = address

      this.updateBalance()

    } catch (e) {
      this.isError = true
      this.errors.push(e.toString())
    }
  }

  /** Ledger ends ***/


  validateInput() {

    this.handleHideError()

    if (isNaN(this.value)) {
      this.isError = true
      this.errors.push("Amount is not valid")
    }

    if (this.unlockBy == 'private_key') {
      if (!this.privateKey || this.privateKey.trim().length == 0) {
        this.isError = true
        this.errors.push("Private key can not be empty")
      }
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

    if(this.message) {
      txn.data = this.message
    }

    txn.gas = this.gas + ''
    txn.gasPrice = this.gasPrice + ''

    //Get nonce and nrgPrice
    let retVal = null
    try {
      retVal = await this.service.fetchNonceNrg(this.from, txn)
    } catch (e) {
      this.isError = true
      this.errors.push("Error to get nonce for the address")
      this.errors.push("[Reason] " + e)
      return;
    }

    if (!retVal) { //Not able to get nonce and estimated nrg
      this.isError = true
      this.errors.push("Unable to get nonce and nrgPrice from AION kernel")
      return
    }
    //End - Get nonce & nrgPrice

    txn.nonce = retVal[0]

    //Check nrglimit with estimated nrg
    let estimatedNrg = retVal[1]
    if (estimatedNrg && estimatedNrg > 0) {
      if(Number(txn.gas) < estimatedNrg) {
        let r = confirm("Estimated Nrg     : " + estimatedNrg + "\nDefault Nrg Limit : " + txn.gas
        +"\n\nDo you want to update the Nrg Limit to " + estimatedNrg + "?");

        if(r == true) {
          this.gas = estimatedNrg
          return
        } else {
          //Just continue;
        }
      }
    }

    console.log("Fetching current nonce " + txn.nonce)

    if(this.unlockBy == 'ledger') {
      this.isNotification = true
      this.notification = "Please check your ledger device to confirm the transaction."
    }

    try {
      this.encodedTxn = await this.provider.sign(txn) //TransactionUtil.signTransaction(txn, this.privateKey)
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
    this.inputDialogEnable = false

    console.log(this.encodedTxn)

  }

  async confirmPayment() {
    this.showConfirm = false
    this.submitRawTransansaction(this.encodedTxn.rawTransaction)
  }

  async submitRawTransansaction(encodedTx) {

    this.txnInProgress = true
    this.txnDone = false

    try {
      //transaction submitted events
      this.transactionInProgress.emit({refId: this.refId, data: encodedTx})

      this.txnResponse = await this.service.sendRawTransaction(encodedTx)
      console.log(this.txnResponse)
      this.txnDone = true

      //Emit transaction successful event
      this.transactionCompleted.emit({refId: this.refId, data: this.txnResponse})

    } catch (error) {
      this.txnDone = true
      this.isError = true
      this.errors.push("Error sending the transaction")
      this.errors.push("[Reason] " + error)

      //Emit transaction failed
      this.transactionFailed.emit({refId: this.refId, data: error.toString()})
      throw error
    } finally {

    }
  }

  renderError() {

    return (
      <div class="error-section">
        {this.isError ?
          <div class="notification is-warning is-small" >
            <button class="delete" onClick={this.handleHideError}></button>
            <ul>
              {this.errors.map((msg) => <li>{msg}</li>)}
            </ul>
          </div> : null
        }
      </div>
    );
  }

  renderNotification() {
    return (
      <div>
        {this.isNotification ?
          <div class="notification is-info error-section">
            <button class="delete" onClick={this.handleHideNotification}></button>
            {this.notification}
          </div> : null
        }
      </div>
    )
  }

  renderSelectProvider() {
    return (
      <div>
        <div class="modal is-active">
          <div class="modal-background"></div>
          <div class="modal-card">
            <header class="modal-card-head">
              <img src={Constant.aion_logo} class="aion-image"></img>
              <p class="modal-card-title">Choose your wallet provider</p>
              <button class="delete" aria-label="close" onClick={this.handleHidePaymentDialog}>&times;</button>
            </header>
            <section class="modal-card-body">
              {this.renderError()}


              <div class="field">
                <div class="control">
                  <label class="label is-small">
                    <input type="radio" name="unlock_by" value="ledger"
                           checked={this.unlockBy === 'ledger'}
                           onClick={(event) => this.handleUnlockBy(event)}
                    ></input>
                    &nbsp;Ledger
                  </label>
                  <label class="label is-small">
                    <input type="radio" name="unlock_by" value="keystore"
                           checked={this.unlockBy === 'keystore'}
                           onClick={(event) => this.handleUnlockBy(event)}
                    >
                    </input>
                    &nbsp;Keystore File
                  </label>
                  <label class="label is-small">
                    <input type="radio" name="unlock_by" value="private_key"
                           checked={this.unlockBy === 'private_key'}
                           onClick={(event) => this.handleUnlockBy(event)}></input>
                    &nbsp;Private Key
                  </label>
                </div>
              </div>
              <hr/>
              <div class="form">
                {this.renderUnlockOptions()}
                <div class="field">
                  <label class="label">&nbsp;&nbsp;</label>
                  <div class="control">
                    <input id="from" placeholder="From Address" class="input is-small" value={this.from}
                           onInput={(e) => this.handleFromInput(e)}
                           readOnly={true} disabled/>
                    {this.fromBalance ?
                      <label
                        class="label is-small from-balance is-pulled-right">Balance: {this.fromBalance} AION</label> : null
                    }
                  </div>
                </div>

              </div>
            </section>
            <footer class="modal-card-foot">
              <button class="button is-primary is-small is-rounded is-pulled-right" disabled={!this.from}
                      onClick={this.handleShowInputDialog}>Next</button>
              <button class="button  is-danger is-small is-rounded is-right" onClick={this.handleHidePaymentDialog}>Cancel</button>
            </footer>
          </div>
        </div>
      </div>
    )
  }

  renderUnlockOptions() {

    return (
      <div>
        {this.unlockBy == 'private_key' ?
          <div class="field">
            <label class="label is-small">Private Key</label>
            <div class="control">
              <input id="private_key" placeholder="Private Key" class="input  is-small" value={this.privateKey}
                     type="password"
                     onInput={(e) => this.handlePrivateKeyInput(e)}
                     onBlur={this.handleDerivePublicKey}></input>
            </div>
          </div> : null
        }

        {this.unlockBy == 'keystore' ?
          this._renderUnlockByKeystore() : null
        }

        {this.unlockBy == 'ledger' ?
          <div class="field">
            <div class="control">
              <button class="button is-small is-danger is-focused is-rounded is-outlined"
                      onClick={this.handleLedgerConnect}>Connect To Ledger
              </button>
            </div>
          </div> : null
        }
      </div>
    )
  }

  _renderUnlockByKeystore() {
    return (
      <div>
        <div class="field is-small">
          <label class="label is-small" htmlFor="private_key">Key Store File</label>
          <div class="control">
            <input id="file-upload"
                   class="is-small"
                   type="file"
                   accept="*"
                   onChange={(e) => this.handleKeyStoreFileSelected(e)}>
            </input>
          </div>
        </div>

        <div class="field">
          <label class="label is-small" htmlFor="keystore_password">Passowrd</label>
          <div class="control">
            <input id="keystore_password"
                   type="password"
                   class="input is-small"
                   value={this.keystore_password}
                   onInput={this.handleKeystorePasswordInput}
            ></input>
          </div>
        </div>
        <div class="field is-grouped">
          <div class="control is-pulled-right">
            <button name="unlock_button"
                    class="button is-small is-danger is-focused is-rounded is-outlined"
                    onClick={this.handleUnlockKeystore}
            >Unlock</button>
          </div>
        </div>

        {this.keystoreLoadingPercentage && this.keystoreLoadingPercentage != 0 && this.keystoreLoadingPercentage != 100 ?

          <div class="modal is-active">
            <div class="modal-background "></div>
            <div class="modal-card">
              <label class="color-white">Unlocking keystore ... {this.keystoreLoadingPercentage}%</label>
              <progress class="progress" value={this.keystoreLoadingPercentage}
                        max="100">{this.keystoreLoadingPercentage}%
              </progress>
            </div>
          </div>
          : null
        }

      </div>
    )
  }

  renderInputForm() {
    return(
      <div>
        <div class="modal is-active">
          <div class="modal-background"></div>
          <div class="modal-card">
            <header class="modal-card-head">
              <img src={Constant.aion_logo} class="aion-image"></img>
              <p class="modal-card-title">Transfer AION</p>
              <button class="delete" aria-label="close" onClick={this.handleHidePaymentDialog}>&times;</button>
            </header>
            <section class="modal-card-body form">

              {this.renderError()}

              {this.renderNotification()}

              <div class="field">
                <label class="label is-small" htmlFor="from">From</label>
                <div class="control">
                  <input id="from" placeholder="From Address" class="input is-small" value={this.from}
                         onInput={(e) => this.handleFromInput(e)}
                         readOnly={true} disabled/>
                  {this.fromBalance ?
                    <label class="label is-small is-pulled-right from-balance">Balance: {this.fromBalance} AION</label> : null
                  }
                </div>
              </div>

              <div class="field">
                <label class="label is-small" htmlFor="to">To</label>
                <div class="control">
                <input id="to" placeholder="To Address"
                       class="input is-small" value={this._to}
                       onInput={this.handleToInput}
                       readOnly={this.to_readonly || this.readonly}
                />
                </div>
              </div>

              <div class="field">
                <label class="label is-small" htmlFor="value">Amount</label>
                <div class="control">
                <input id="value" placeholder="Enter amount" class="input is-small" value={this.value}
                       type="number"
                       onInput={this.handleValueInput}
                       readonly={this.readonly}
                />
                </div>
              </div>

              <div class="columns">
                <div class="column">
                <div class="field">
                  <label class="label is-small" htmlFor="nrg">Nrg Limit</label>
                  <div class="control">
                    <input id="nrg" placeholder="Nrg Limit" class="input is-small" value={this.gas}
                           type="number"
                           onInput={this.handleNrgInput}
                    />
                  </div>
                </div>

                </div>
                <div class="column">
                <div class="field">
                  <label class="label is-small" htmlFor="nrgPrice">Nrg Price</label>
                  <div class="control">
                    <input id="nrgPrice" placeholder="Nrg Price" class="input is-small" value={this.gasPrice}
                           type="number"
                           onInput={this.handleNrgPriceInput}
                    />
                  </div>
                </div>
                </div>
              </div>

              <div class="field">
                <label class="label is-small" htmlFor="message">Message</label>
                <div class="control">
                  <textarea id="message" class="textarea is-small" placeholder="Optional message"
                            onInput={this.handleMessageInput}
                            readonly={this.readonly}
                  >{this.message}</textarea>
                </div>
              </div>
            </section>

            <footer class="modal-card-foot">
              <button class="button is-primary is-small is-rounded"
                      onClick={this.signPayment}>Next
              </button>
              <button class="button  is-danger is-small is-rounded"
                      onClick={this.handleHidePaymentDialog}>Cancel
              </button>
            </footer>

          </div>
        </div>
      </div>
    )
  }

  renderShowConfirmation() {
    return (
      <div class="modal is-active">
        <div class="modal-background"></div>
        <div class="modal-card">
          <header class="modal-card-head">
            <img src={Constant.aion_logo} class="aion-image"></img>
            <p class="modal-card-title">Confirm Transaction</p>
            <button class="delete" aria-label="close" onClick={this.handleHidePaymentDialog}>&times;</button>
          </header>
          <section class="modal-card-body form">

            {this.renderError()}

            <div class="columns">
              <div class="column is-1"><label class="lable">From</label></div>
              <div class="column field">{this.encodedTxn.input.from}</div>
            </div>
            <div class="columns">
              <div class="column is-1">To</div>
              <div class="column field">
                {this.encodedTxn.input.to}
              </div>
            </div>
            <div class="columns">
              <div class="column is-1">Value</div>
              <div class="column field">{CryptoUtil.convertnAmpBalanceToAION(this.encodedTxn.input.value)} AION</div>
            </div>
            <div class="columns">
              <div class="column is-1">Nrg</div>
              <div class="column field">{this.encodedTxn.input.gas}</div>
            </div>
            <div class="columns">
              <div class="column is-1">Nrg Price</div>
              <div class="column field">{this.encodedTxn.input.gasPrice}</div>
            </div>
            <div class="columns">
              <div class="column is-1">Raw Transaction</div>
              <div class="column field">
                <textarea class="input is-small" rows={10} readOnly={true}>{this.encodedTxn.rawTransaction}</textarea>
              </div>
            </div>
          </section>
          <footer class="modal-card-foot">
            <button type="button" class="button is-primary is-small is-rounded" onClick={this.confirmPayment}>Confirm
            </button>
            <button type="button" class="button is-danger is-small is-rounded" onClick={this.handleHidePaymentDialog}>Close
            </button>
          </footer>
        </div>
      </div>
    )
  }

  renderTxnInProgress() {
    return (
      <div>
        <div class="modal is-active">
          <div class="modal-background"></div>
          <div class="modal-card">
            <header class="modal-card-head">
              <img src={Constant.aion_logo} class="aion-image"></img>
              <p class="modal-card-title">Sending AION</p>
              <button class="delete" aria-label="close" onClick={this.handleHidePaymentDialog}>&times;</button>
            </header>
            <section class="modal-card-body form">
              {this.renderError()}

              {!this.txnDone ?
                <div>
                  <div class="spinner">Loading ...</div>
                  &nbsp; <i>Sending transaction and waiting for at least one block confirmation. Please wait ...</i>
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

            </section>
          </div>
        </div>
      </div>
    )
  }

  render() {
    return (
      <div  class="aion-pay">

        {this.visible ?
          this.renderSelectProvider() : null
        }

        {this.inputDialogEnable ?
          this.renderInputForm() : null
        }

        {this.txnInProgress ?
          this.renderTxnInProgress() : <div></div>
        }

        {this.showConfirm ?
          this.renderShowConfirmation() : null
        }
        <div id="pay" onClick={this.handleShowPaymentDialog}>
          <slot>
            <button type="button" class="button pay-button is-primary">
                <span class="pay-button-text">
                  <img src={Constant.aion_logo} class="img-valign"></img>
                  {this.buttonText ? this.buttonText : this.default_button_text}
                </span>
            </button>
          </slot>
        </div>
      </div>

    );
  }
}
