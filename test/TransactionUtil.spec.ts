import {TransactionUtil} from "../src/providers/util/TransactionUtil";
import {Transaction} from "../src/common/Transaction";

describe("Transaction signing tests", () => {
  let expectedEncodedTransaction = "0xf8a001a0a050486fc4a5c236a9072961a5b7394885443cd53a704b2630d495d2fc6c268b880de0b6b3a764000080845b8457118252088800000002540be40001b8604dcff097bf9912b71d619fc78100de8cf7f55dfddbc2bf5f9fdc36bd670781ee84be4c9fdfa713e23c6b1b7f74e77f2a65037b82088611ae496c40ffc182fce2683787da136b19872cc7d9ac95a1c3400e2345202a7b09ec67c876587818010b";
  let transaction = new Transaction();
  transaction.nonce = 1;
  transaction.to = "0xa050486fc4a5c236a9072961a5b7394885443cd53a704b2630d495d2fc6c268b";

  transaction.value = 1000000000000000000;
  transaction.data = "";
  transaction.gas = "21000";
  transaction.gasPrice = "10000000000";
  transaction.timestamp = 1535399697;
  transaction.type = 1;

  it('should correctly sign transaction data', async () => {
    let privateKey = "efbc7a4bb0bf24624f97409473027b62f7ff76e3d232f167e002e1f5872cc2884dcff097bf9912b71d619fc78100de8cf7f55dfddbc2bf5f9fdc36bd670781ee";

    let signTransaction = TransactionUtil.signTransaction(transaction, privateKey)

    console.log(signTransaction)

    expect(signTransaction.rawTransaction).toBe(expectedEncodedTransaction)
  });

  it('should correctly sign transaction data also when privatekey starts with 0x', async () => {
    let privateKey = "0xefbc7a4bb0bf24624f97409473027b62f7ff76e3d232f167e002e1f5872cc2884dcff097bf9912b71d619fc78100de8cf7f55dfddbc2bf5f9fdc36bd670781ee";

    let signTransaction = TransactionUtil.signTransaction(transaction, privateKey)

    console.log(signTransaction)

    expect(signTransaction.rawTransaction).toBe(expectedEncodedTransaction)
  });

  it('should return correct aion address from publickey', async () => {

    let privateKey = "5abbdaccc3959e80fb708442b4dc15c29682badb036c71dd1bac06834513bfc954dc917cdb64ef327021109835bbf8add6638574666f999bebdb0815315875f5"
    let expectedAddress = "0xa0c0cc973a306d31320fe72cad62afaa799d076bbd492ca4d5d5d941adfa12a9"

    let [address] = TransactionUtil.getAddress(privateKey)

    expect(address).toBe(expectedAddress)
  })
})
