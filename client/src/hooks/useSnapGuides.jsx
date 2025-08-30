// useSnapGuides.jsx
import { useMemo } from "react";

const SNAP_THRESHOLD = 5;

export const useSnapGuides = (activeElement, otherElements, canvasRef) => {
  const guides = useMemo(() => {
    if (!activeElement || !canvasRef?.current) {
      return []; // always return an array
    }

    const getGuidesForElement = (element) => {
      const { position, size, rotation } = element;
      if (rotation) return [];
      const width = parseFloat(size.width) || 0;
      const height = parseFloat(size.height) || 0;
      return [
        { type: "v", x: position.x },
        { type: "v", x: position.x + width / 2 },
        { type: "v", x: position.x + width },
        { type: "h", y: position.y },
        { type: "h", y: position.y + height / 2 },
        { type: "h", y: position.y + height },
      ];
    };

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasGuides = [
      { type: "v", x: canvasRect.width / 2 },
      { type: "h", y: canvasRect.height / 2 },
    ];

    const elementGuides = otherElements.flatMap(getGuidesForElement);
    const activeGuides = getGuidesForElement(activeElement);

    let snapLines = [];
    for (const activeGuide of activeGuides) {
      for (const targetGuide of [...canvasGuides, ...elementGuides]) {
        if (activeGuide.type !== targetGuide.type) continue;
        if (
          (activeGuide.type === "v" &&
            Math.abs(activeGuide.x - targetGuide.x) < SNAP_THRESHOLD) ||
          (activeGuide.type === "h" &&
            Math.abs(activeGuide.y - targetGuide.y) < SNAP_THRESHOLD)
        ) {
          snapLines.push(
            activeGuide.type === "v"
              ? { x: targetGuide.x, y: 0, width: "1px", height: "100%" }
              : { x: 0, y: targetGuide.y, width: "100%", height: "1px" }
          );
        }
      }
    }
    return snapLines;
  }, [activeElement, otherElements, canvasRef]);

  return { guides };
};
