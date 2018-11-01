import rlp from "aion-rlp";
import {AionLong} from "aion-rlp";
import BN from "bn.js";
import nacl from 'tweetnacl';
import {Buffer} from 'buffer'

import {Transaction} from "./Transaction"
import {CryptoUtil} from "./CryptoUtil"
import {SignedTransaction} from "./SignedTransaction";

export class TransactionUtil {

  public static signTransaction(transaction: Transaction, privateKey: string) {
    const txArray = new Array()

    txArray.push(new BN(transaction.nonce))
    txArray.push(transaction.to.toLowerCase())
    txArray.push(transaction.value)
    txArray.push(transaction.data)


    if(transaction.timestamp !== 0)
      txArray.push(transaction.timestamp)
    else {
      transaction.timestamp = Date.now() / 1000
      txArray.push(transaction.timestamp)
    }

    if(transaction.gas)
      txArray.push(new AionLong(new BN(transaction.gas)))
    else {
      transaction.gas = "22000";
      txArray.push(new AionLong(new BN(transaction.gas)))
    }

    if(transaction.gasPrice)
      txArray.push(new AionLong(new BN(transaction.gasPrice)))
    else {
      transaction.gasPrice = "10000000000"
      txArray.push(new AionLong(new BN(transaction.gasPrice)))
    }

    if(transaction.type !== 0)
      txArray.push(transaction.type)
    else {
      transaction.type = 1
      txArray.push(transaction.type)
    }

    const rlpOutput: Uint8Array = rlp.encode(txArray)
    const hash = CryptoUtil.blake2b256(rlpOutput)

    //sign with ncal
    const privateKeyBuff = CryptoUtil.hex2ua(privateKey)

    const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBuff)

    // console.log("Public key: " + CryptoUtil.uia2hex(keyPair.publicKey))

    const signature = nacl.sign.detached(hash, keyPair.secretKey)

    // console.log("***" + signature)

    if (nacl.sign.detached.verify(hash, signature, keyPair.publicKey) === false) {
      throw new Error('Could not verify signature.')
    }

    // address + message signature length
    let aionPubSigLen = nacl.sign.publicKeyLength + nacl.sign.signatureLength
    // aion-specific signature scheme
    const aionPubSig = CryptoUtil.concatBuffer(keyPair.publicKey, signature, aionPubSigLen)

    // add the aion pub-sig
    // @ts-ignore
    const rawTx = rlp.decode(rlpOutput).concat(Buffer.from(aionPubSig))

    console.log(CryptoUtil.uia2hex(aionPubSig))

    console.log(rawTx)

    console.log(rawTx instanceof Array)

    // re-encode with signature included
    const rawTransaction = rlp.encode(rawTx)

    // console.log(rawTransaction)

    const rawTransactionHash = CryptoUtil.uia2hex(rawTransaction)

    // @ts-ignore
   console.log(rawTransactionHash)

    let signedTransaction = new SignedTransaction()
    signedTransaction.messageHash = CryptoUtil.uia2hex(hash)
    signedTransaction. signature = CryptoUtil.uia2hex(aionPubSig)
    signedTransaction.rawTransaction = CryptoUtil.uia2hex(rawTransaction)
    signedTransaction.input = transaction

    return signedTransaction
  }

  public static getAddress(privateKey) {
    //sign with ncal
    const privateKeyBuff = CryptoUtil.hex2ua(privateKey)

    const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBuff)

    return CryptoUtil.createA0Address(keyPair.publicKey);

  }

  /*public static encode() {

     let transaction = new Transaction();
     transaction.nonce = 14;
     transaction.to = "0xa050486fc4a5c236a9072961a5b7394885443cd53a704b2630d495d2fc6c268b";
    // transaction.from = "0xa035872d6af8639ede962dfe7536b0c150b590f3234a922fb7064cd11971b58e";

     transaction.value = 56666000000000000099;
     transaction.data = "";
     transaction.gas = "22000";
     transaction.gasPrice = "10000000000";
     // transaction.timestamp = 1535399697;
    transaction.timestamp = Date.now() / 1000;
     transaction.type = 1;

     console.log(transaction.timestamp);
    //const expectedOutput: string = "f84801a09aabf5b86690ca4cae3fada8c72b280c4b9302dd8dd5e17bd788f241d7e3045c01a0a035872d6af8639ede962dfe7536b0c150b590f3234a922fb7064cd11971b58e80010101";
    const txArray = new Array();

    txArray.push(new BN(transaction.nonce));
    txArray.push(transaction.to.toLowerCase());
    txArray.push(transaction.value);
    txArray.push(transaction.data);
    txArray.push(transaction.timestamp);
    txArray.push(new AionLong(new BN(transaction.gas)));
    txArray.push(new AionLong(new BN(transaction.gasPrice)));
    txArray.push(transaction.type);


    const rlpOutput: Uint8Array = rlp.encode(txArray);

    const hash = CryptoUtil.blake2b256(rlpOutput);

    console.log("hash", CryptoUtil.uia2hex(hash));

    console.log(hash);

    console.log("#####");

    const privateKey = "5abbdaccc3959e80fb708442b4dc15c29682badb036c71dd1bac06834513bfc954dc917cdb64ef327021109835bbf8add6638574666f999bebdb0815315875f5";
    //const privateKey = "efbc7a4bb0bf24624f97409473027b62f7ff76e3d232f167e002e1f5872cc2884dcff097bf9912b71d619fc78100de8cf7f55dfddbc2bf5f9fdc36bd670781ee";

    //sign with ncal


    const privateKeyBuff = CryptoUtil.hex2ua(privateKey);

    const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBuff)

    console.log("Public key: " + CryptoUtil.uia2hex(keyPair.publicKey));

    const signature = nacl.sign.detached(hash, keyPair.secretKey)

    console.log("***" + signature);

    if (nacl.sign.detached.verify(hash, signature, keyPair.publicKey) === false) {
      throw new Error('Could not verify signature.');
    }

    // address + message signature length
    let aionPubSigLen = nacl.sign.publicKeyLength + nacl.sign.signatureLength
    // aion-specific signature scheme
    const aionPubSig = CryptoUtil.concatBuffer(keyPair.publicKey, signature, aionPubSigLen);

    console.log(keyPair.publicKey.length);
    console.log(signature.length);
    console.log(aionPubSig.length)

    console.log("****")
    console.log(aionPubSig)

    console.log("$$$$");
    console.log(rlp.decode(rlpOutput));

    //const decodedRlpOutput: Uint8Array[] = rlp.decode(rlpOutput);

    // add the aion pub-sig
    // @ts-ignore
    const rawTx = rlp.decode(rlpOutput).concat(Buffer.from(aionPubSig));

    console.log(CryptoUtil.uia2hex(aionPubSig));

    console.log(rawTx);

    console.log(rawTx instanceof Array);

    // re-encode with signature included
    const rawTransaction = rlp.encode(rawTx);

    console.log(rawTransaction)

    const rawTransactionHash = CryptoUtil.uia2hex(rawTransaction)

    // @ts-ignore
    console.log(rawTransactionHash);
    //console.log(expectedOutput);
  }*/
}
