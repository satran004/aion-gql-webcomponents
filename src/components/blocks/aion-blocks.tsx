import {Component, Prop, State} from '@stencil/core';
import {Block} from "./Block";

@Component({
  tag: 'aion-blocks',
  styleUrl: 'aion-blocks.scss',
  shadow: true
})
export class AionBlocks {
  @Prop() duration: number;

  @Prop() limit: number;

  @Prop() gqlUrl: string;

  @State() blocks: Block[] = [];

  // blocks(first: 10, before: 1529873) {
  BLOCKS_QUERY: string =  `
    query blocks($first: Long) {
     blockApi {
      blocks(first: $first) {
        number
        hash
        parentHash
        nrgLimit
        nrgConsumed
        timestamp
        txDetails {
          from
          to
          value
          txHash
        }
      }
    }
  }
  `
  constructor() {

  }

  componentDidLoad() {
    this.fetchBlocks();

    let duration = this.duration;

    //Less than 10 sec should not be allowed
    if(this.duration < 10)
      duration = 10;

    setInterval(() => {
      this.fetchBlocks();

    }, duration * 1000);
  }

  private fetchBlocks() {
    fetch(this.gqlUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({"query": this.BLOCKS_QUERY, "variables": {"first": this.limit}}),
    })
      .then(res => res.json())
      .then(res => {
        console.log("fetched");

        if(this.blocks)
          this.blocks.splice(0, this.blocks.length)

        let fetchedBlocks = ((res["data"])["blockApi"])["blocks"] as [Block];
        this.blocks = fetchedBlocks.map(b => {
          let date = new Date(b.timestamp * 1000);
          b.date = date;

          return b;
        })

      });
  }

  render() {
    return (
      <div class="aion-blocks panel box is-12-mobile">
        <div class="panel-heading">Recent Blocks</div>
        <br/>
        {this.blocks.map((blk) =>

            <article class="is-info box">

                <div class="heading">
                <strong>#{blk.number}</strong> &nbsp;- <small>{blk.date.toDateString()}&nbsp;{blk.date.toLocaleTimeString()}</small>
                  <br/>
                  <small><a href={"https://mainnet.aion.network/#/block/" + blk.number} target="_blank">
                    <i> 0x{blk.hash}&nbsp;</i>
                  </a>
                  </small>
                </div>

              <div class="content transactions">
                   {blk.txDetails.map( (tx, index) => {
                      return (

                        <div class="transaction" key={index}>
                          <div class="columns">
                            <div class="column is-two is-12-mobile">
                              <strong>Tx #</strong>
                            </div>
                            <div class="column is-10 is-12-mobile">
                              <a href={"https://mainnet.aion.network/#/transaction/" + tx.txHash} target="_blank">
                                0x{tx.txHash}&nbsp;
                              </a>
                            </div>
                          </div>
                          <div class="columns">
                            <div class="column is-two is-12-mobile">
                              <strong>From</strong>
                            </div>
                            <div class="column is-10 is-12-mobile">
                              0x{tx.from}
                            </div>
                          </div>
                          <div class="columns">
                            <div class="column is-two is-12-mobile">
                              <strong>To</strong>
                            </div>
                            <div class="column is-10 is-12-mobile">
                              0x{tx.to}
                            </div>
                          </div>
                          <div class="columns">
                            <div class="column is-two is-12-mobile">
                              <strong>Value</strong>
                            </div>
                            <div class="column is-10 is-12-mobile">
                              <strong>{tx.value / Math.pow(10, 18)} AION</strong>
                            </div>
                          </div>
                          <br/>
                        </div>
                      );
                      }

                    )}
              </div>
            </article>
        )}
      </div>

    );
  }
}
