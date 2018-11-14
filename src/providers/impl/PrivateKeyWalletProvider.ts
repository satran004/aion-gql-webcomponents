import {WalletProvider} from "../WalletProvider";
import {TransactionUtil} from "../../common/TransactionUtil";
import {Transaction} from "../../common/Transaction";
import {SignedTransaction} from "../../common/SignedTransaction";

export default class PrivateKeyWalletProvider implements WalletProvider {

  private privateKey
  // @ts-ignore
  private address
  // @ts-ignore
  private publicKey

  constructor(privateKey) {
    this.privateKey = privateKey
  }

  async unlock(progressCallback: (number) => {}): Promise<[string, string]> {

    try {
      let [address, publicKey] = TransactionUtil.getAddress(this.privateKey)

      this.address = address
      this.publicKey = publicKey

      if (progressCallback)
        progressCallback(100)

      return [address, publicKey]
    } catch (e) {
      console.log(e)
      throw e
    }

  }

  async sign(transaction: Transaction): Promise<SignedTransaction> {

    let mainThis = this
    if (!mainThis.privateKey) {
      throw new Error("Can not sign a transaction with null privatekey")
    }

    let encodedSignedTxn = TransactionUtil.signTransaction(transaction, mainThis.privateKey)
    return encodedSignedTxn

  }

}
