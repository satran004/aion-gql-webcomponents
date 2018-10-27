var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, Prop, State } from '@stencil/core';
let AionBlocks = class AionBlocks {
    constructor() {
        this.blocks = [];
        // blocks(first: 10, before: 1529873) {
        this.BLOCKS_QUERY = `
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
  `;
    }
    componentDidLoad() {
        this.fetchBlocks();
        setInterval(() => {
            this.fetchBlocks();
        }, this.duration * 1000);
    }
    fetchBlocks() {
        fetch(this.gqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "query": this.BLOCKS_QUERY, "variables": { "first": this.limit } }),
        })
            .then(res => res.json())
            .then(res => {
            console.log("fetched");
            if (this.blocks)
                this.blocks.splice(0, this.blocks.length);
            let fetchedBlocks = ((res["data"])["blockApi"])["blocks"];
            this.blocks = fetchedBlocks.map(b => {
                let date = new Date(b.timestamp * 1000);
                b.date = date;
                return b;
            });
        });
    }
    render() {
        return (h("div", { class: "o-container o-container--medium" }, this.blocks.map((blk) => h("div", { class: "c-card u-highest" },
            h("div", { class: "c-card__item c-card__item--brand" },
                "#",
                blk.number,
                h("span", { class: "title u-small" },
                    blk.date.toDateString(),
                    " ",
                    blk.date.toLocaleTimeString()),
                h("div", { class: "u-small" },
                    h("i", null,
                        " 0x",
                        blk.hash,
                        "\u00A0",
                        h("a", { href: "https://mainnet.aion.network/#/block/" + blk.hash, target: "_blank" },
                            h("i", { class: "fas fa-arrow-alt-circle-right" }))))),
            h("div", { class: "c-card-body" },
                h("div", { class: "o-panel-container" },
                    h("ol", { class: "c-list  u-small" }, blk.txDetails.map((tx, index) => {
                        return (h("li", { class: "c-list__item", key: index },
                            h("div", { class: "o-grid " },
                                h("div", { class: "o-grid__cell o-grid__cell--width-20 title" }, "Tx Hash"),
                                h("div", { class: "o-grid__cell" },
                                    h("a", { href: "https://mainnet.aion.network/#/transaction/" + tx.txHash, target: "_blank" },
                                        tx.txHash,
                                        "\u00A0"))),
                            h("div", { class: "o-grid" },
                                h("div", { class: "o-grid__cell o-grid__cell--width-20 title" }, "From"),
                                h("div", { class: "o-grid__cell" },
                                    "0x",
                                    tx.from)),
                            h("div", { class: "o-grid " },
                                h("div", { class: "o-grid__cell o-grid__cell--width-20 title" }, "To"),
                                h("div", { class: "o-grid__cell" },
                                    "0x",
                                    tx.to)),
                            h("div", { class: "o-grid " },
                                h("div", { class: "o-grid__cell o-grid__cell--width-20 title" }, "Value"),
                                h("div", { class: "o-grid__cell" },
                                    tx.value / Math.pow(10, 18),
                                    " AION"))));
                    }))))))));
    }
};
__decorate([
    Prop()
], AionBlocks.prototype, "duration", void 0);
__decorate([
    Prop()
], AionBlocks.prototype, "limit", void 0);
__decorate([
    Prop()
], AionBlocks.prototype, "gqlUrl", void 0);
__decorate([
    State()
], AionBlocks.prototype, "blocks", void 0);
AionBlocks = __decorate([
    Component({
        tag: 'aion-blocks',
        styleUrl: 'aion-blocks.scss',
    })
], AionBlocks);
export { AionBlocks };
