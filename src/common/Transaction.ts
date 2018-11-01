// import  {AionLong} from "aion-rlp";

export class Transaction {
  nonce: number
  to: string
  from: string
  value: number = 0
  data: string
  timestamp: number = 0
  gas: string
  gasPrice: string
  type: number = 0
}
