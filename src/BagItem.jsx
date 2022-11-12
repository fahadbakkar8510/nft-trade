import React, { useEffect, memo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import StyledBagItem from "./BagItem.style";
import { ItemTypes } from "./ItemTypes";
import { clone } from "./funcs";
import { useStore } from "./store";
import { Stack } from "@mui/system";

let lastClick = Date.now();

export const PresentationalBagItem = ({ drag, isDragging, item }) => {
  const { updateSelItem } = useStore();

  const handleClick = (item) => {
    // check for double click
    const now = Date.now();
    if (now - lastClick < 500) {
      // double click
      if (window && window.openInWebaverse) {
        window.openInWebaverse(item);
      } else {
        updateSelItem(item);
      }
    }
    lastClick = now;
  };

  return item ? (
    <StyledBagItem ref={drag} isDragging={isDragging} data-tip>
      {item.metadata ? (
        <>
          {item.metadata.image ? (
            <Stack
              justifyContent={"center"}
              alignItems={"center"}
              width={"100%"}
              height={"100%"}
              onClick={() => handleClick(item)}
            >
              {item.metadata.image.includes("mp4") && (
                <video src={item.metadata.image} autoPlay loop muted />
              )}
              {(item.metadata.image.includes("jpg") ||
                item.metadata.image.includes("png")) && (
                <img src={item.metadata.image} />
              )}
            </Stack>
          ) : (
            <></>
          )}
        </>
      ) : (
        <></>
      )}
    </StyledBagItem>
  ) : (
    <></>
  );
};

const BagItem = ({
  item,
  isForTrade,
  index,
  tradeBoxes,
  updateTradeBoxes,
  tradeLayer,
}) => {
  const ref = useRef(null);
  const { plugActor, tradeData, isCreator } = useStore();
  if (!item) item = {};
  item.isForTrade = isForTrade;

  const [{ handlerId }, drop] = useDrop({
    accept: ItemTypes.LAYER1,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    drop(dragEl, monitor) {
      // console.log("drag item: ", dragEl.item);
      // console.log("hover item: ", item);
      if (!ref.current || item.canister || !plugActor || !tradeData) return; // When full item

      const dragIndex = dragEl.index;
      const hoverIndex = index;
      const cloneDragTradeItem = clone(dragEl.item);
      const cloneDragTradeBoxes = clone(dragEl.tradeBoxes);
      const cloneHoverTradeItem = clone(item);
      const cloneHoverTradeBoxes = clone(tradeBoxes);

      console.log("cloneDragTradeItem: ", cloneDragTradeItem);
      // console.log("cloneHoverTradeItem: ", cloneHoverTradeItem);
      // console.log("cloneDragTradeBoxes: ", cloneDragTradeBoxes);
      // console.log("cloneHoverTradeBoxes: ", cloneHoverTradeBoxes);
      console.log("tradeLayer: ", tradeLayer);
      console.log("dragEl.tradeLayer: ", dragEl.tradeLayer);

      // Time to combine with ic
      if (dragEl.tradeLayer === "inventory" && tradeLayer === "local") {
        (async () => {
          // const res = await plugActor.add_item_to_trade(tradeData.id, {
          //   name: cloneDragTradeItem.metadata.name,
          //   canisterId: isCreator ? tradeData.host : tradeData.guest,
          //   tokenId: cloneDragTradeItem.id,
          // });
          // console.log("add_item_to_trade res: ", res);
          // const res = await plugActor.get_all_trades();
          // console.log("get_all_trades res: ", res);
        })();
      }

      if (dragEl.tradeLayer === "local" && tradeLayer === "inventory") {
        (async () => {
          const res = await plugActor.remove_item_from_trade(tradeData.id, {
            name: cloneDragTradeItem.metadata.name,
            canisterId: isCreator ? tradeData.host : tradeData.guest,
            tokenId: cloneDragTradeItem.id,
          });
          console.log("remove_item_from_trade res: ", res);
        })();
      }

      // Time to actually perform the action
      if (tradeLayer === dragEl.tradeLayer) {
        cloneDragTradeBoxes[dragIndex].item = cloneHoverTradeItem;
        cloneDragTradeBoxes[hoverIndex].item = cloneDragTradeItem;
        updateTradeBoxes(cloneDragTradeBoxes);
      } else {
        cloneDragTradeBoxes[dragIndex].item = cloneHoverTradeItem;
        cloneHoverTradeBoxes[hoverIndex].item = cloneDragTradeItem;
        dragEl.updateTradeBoxes(cloneDragTradeBoxes);
        updateTradeBoxes(cloneHoverTradeBoxes);
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.LAYER1,
    canDrag: true,
    item: () => {
      return { index, tradeBoxes, updateTradeBoxes, item, tradeLayer };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId}>
      <PresentationalBagItem drag={drag} isDragging={isDragging} item={item} />
    </div>
  );
};

export default memo(BagItem);
