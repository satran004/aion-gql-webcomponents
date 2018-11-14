import {Transaction} from "../common/Transaction";
import {SignedTransaction} from "../common/SignedTransaction";

export interface WalletProvider {

  unlock(progressCallback: (number) => any): Promise<[string, string]>

  sign(transaction: Transaction): Promise<SignedTransaction>

}
