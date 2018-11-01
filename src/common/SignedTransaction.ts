import {Transaction} from "./Transaction";

export class SignedTransaction {

  messageHash: string
  signature: string
  rawTransaction: string

  input: Transaction

}
