import { RequestHandler, Express } from "express";
import * as bodyParser from "body-parser";
import { Principal, ic } from "azle";

class Item {
  public id: string;
  public image: string;
  public slotType: string;
  public slot: number;

  constructor(id: string, image: string, slotType: string, slot: number) {
    this.id = id;
    this.image = image;
    this.slotType = slotType;
    this.slot = slot;
  }
}

class Trade {
  public id: string;
  public host: Principal;
  public guest: Principal;
  public hostData: Item[] = [];
  public guestData: Item[] = [];
  public hostEscrow: Item[] = [];
  public guestEscrow: Item[] = [];
  public hostAccept: boolean = false;
  public guestAccept: boolean = false;
  public fulfilled: boolean = false;

  constructor(id: string, host: Principal, guest: Principal) {
    this.id = id;
    this.host = host;
    this.guest = guest;
  }
}

const urlParser = bodyParser.urlencoded({ extended: false })
const jsonParser = bodyParser.json();
const logRequest: RequestHandler = (req, res, next) => {
  console.log(req.method + " Request: " + req.url);
  next();
}
const nullPrincipal = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
const trades = new Map<string, Trade>();

export function setupRoutes(app: Express) {
  app.use(logRequest);

  app.use("/get_trades", async (req, res) => {
    res.json(trades);
  })

  const get_trade_by_id = (id: string) => {
    const trade = trades.get(id);
    return trade;
  }

  app.use("/get_trade_by_id", async (req, res) => {
    const id = req.body.id;
    const trade = get_trade_by_id(id);
    res.json(trade);
  })

  function create_trade() {
    const id = trades.size.toString();
    const trade = new Trade(id, ic.caller(), nullPrincipal);
    trades.set(id, trade);
    return trade;
  }

  app.use("/create_trade", async (req, res) => {
    const trade = create_trade();
    res.json(trade);
  })

  const accept = (id: string) => {
    const trade = trades.get(id);
    if (trade!.host === ic.caller()) {
      trade!.hostAccept = true;
    } else if (trade!.guest === ic.caller()) {
      trade!.guestAccept = true;
    }
    return trade;
  }

  app.use("/accept", async (req, res) => {
    const id = req.body.id;
    const trade = accept(id);
    res.json(trade);
  })

  function cancel(id: string) {
    const trade = trades.get(id);
    if (trade!.host === ic.caller() && !trade!.guestAccept) {
      trade!.hostAccept = false;
    } else if (trade!.guest === ic.caller() && !trade!.hostAccept) {
      trade!.guestAccept = false;
    }
    return trade;
  }

  app.use("/cancel", async (req, res) => {
    const id = req.body.id;
    const trade = cancel(id);
    res.json(trade);
  })

  function delete_trade(id: string) {
    const trade = trades.get(id);
    trades.delete(id);
    return trade;
  }

  app.use("/delete_trade", async (req, res) => {
    const id = req.body.id;
    const trade = delete_trade(id);
    res.json(trade);
  })

  function join_trade(id: string) {
    const trade = trades.get(id);
    trade!.guest = ic.caller();
    return trade;
  }

  app.use("/join_trade", async (req, res) => {
    const id = req.body.id;
    const trade = join_trade(id);
    res.json(trade);
  })

  function leave_trade(id: string) {
    const trade = trades.get(id);
    if (trade!.host === ic.caller()) {
      return delete_trade(id);
    } else if (trade!.guest === ic.caller()) {
      trade!.guest = nullPrincipal;
    }
    return trade;
  }

  app.use("/leave_trade", async (req, res) => {
    const id = req.body.id;
    const trade = leave_trade(id);
    res.json(trade);
  })

  function add_item_to_trade(id: string, item: Item) {
    const trade = trades.get(id);
    if (ic.caller() === trade!.host) {
      trade!.hostData.push(item);
    } else if (ic.caller() === trade!.guest) {
      trade!.guestData.push(item);
    }
    return trade;
  }

  app.use("/add_item_to_trade", async (req, res) => {
    const id = req.body.id;
    const item = req.body.item;
    const trade = add_item_to_trade(id, item);
    res.json(trade);
  })

  function remove_item_from_trade(id: string, item: Item) {
    const trade = trades.get(id);
    if (ic.caller() === trade!.host) {
      trade!.hostData = trade!.hostData.filter((i) => i !== item);
    } else if (ic.caller() === trade!.guest) {
      trade!.guestData = trade!.guestData.filter((i) => i !== item);
    }
    return trade;
  }

  app.use("/remove_item_from_trade", async (req, res) => {
    const id = req.body.id;
    const item = req.body.item;
    const trade = remove_item_from_trade(id, item);
    res.json(trade);
  })

  function add_item_to_escrow(id: string, item: Item) {
    // TODO: the user needs to upload their asset here

    const trade = trades.get(id);
    if (ic.caller() === trade!.host) {
      trade!.hostEscrow.push(item);
    } else if (ic.caller() === trade!.guest) {
      trade!.guestEscrow.push(item);
    }
    if (
      trade!.hostEscrow === trade!.hostData &&
      trade!.guestEscrow === trade!.guestData
    ) {
      trade!.fulfilled = true;
    }
    return trade;
  }

  app.use("/add_item_to_escrow", async (req, res) => {
    const id = req.body.id;
    const item = req.body.item;
    const trade = add_item_to_escrow(id, item);
    res.json(trade);
  })

  function remove_item_from_escrow(id: string, item: Item) {
    // TODO: the asset is returned to the user

    const trade = trades.get(id);
    if (trade!.fulfilled) return trade;
    if (ic.caller() === trade!.host && trade!.guestEscrow !== trade!.guestData) {
      trade!.hostEscrow = trade!.hostEscrow.filter((i) => i !== item);
    } else if (
      ic.caller() === trade!.guest &&
      trade!.hostEscrow !== trade!.hostData
    ) {
      trade!.guestEscrow = trade!.guestEscrow.filter((i) => i !== item);
    }
    return trade;
  }

  app.use("/remove_item_from_escrow", async (req, res) => {
    const id = req.body.id;
    const item = req.body.item;
    const trade = remove_item_from_escrow(id, item);
    res.json(trade);
  })

  function get_escrow_items(id: string) {
    const trade = trades.get(id);
    if (ic.caller() === trade!.host) {
      return trade!.guestEscrow;
    } else if (ic.caller() === trade!.guest) {
      return trade!.hostEscrow;
    }
    return [];
  }

  app.use("/get_escrow_items", async (req, res) => {
    const id = req.body.id;
    const items = get_escrow_items(id);
    res.json(items);
  })

  function get_escrow_items_self(id: string) {
    const trade = trades.get(id);
    if (ic.caller() === trade!.guest) {
      return trade!.guestEscrow;
    } else if (ic.caller() === trade!.host) {
      return trade!.hostEscrow;
    }
    return [];
  }

  app.use("/get_escrow_items_self", async (req, res) => {
    const id = req.body.id;
    const items = get_escrow_items_self(id);
    res.json(items);
  })

  function withdraw_from_escrow(id: string, item: Item) {
    const trade = trades.get(id);
    let claimedItem;
    if (trade!.fulfilled) {
      // TODO: the asset is returned to the user

      if (ic.caller() === trade!.host) {
        claimedItem = trade!.guestEscrow.find((i) => i === item);
      } else if (ic.caller() === trade!.guest) {
        claimedItem = trade!.hostEscrow.find((i) => i === item);
      }
    }
    return claimedItem ?? item;
  }

  app.use("/withdraw_from_escrow", async (req, res) => {
    const id = req.body.id;
    const item = req.body.item;
    const claimedItem = withdraw_from_escrow(id, item);
    res.json(claimedItem);
  })
}
