class Transaction {
  from: String
  to: String
  value: number
  txHash: String
}

export interface Block {
  number: String
  hash: String
  timestamp: number
  date: Date

  txDetails: Transaction[]

  expand: Boolean
  // value: number
  // nrgLimit: number,
  // nrgConsumed: number
  // solution: string

}
