// This file is a placeholder for more complex canvas utilities.
// The getRotatedBoundingBox function is complex and is not fully implemented
// in the editor, but we include the file to resolve the import.

export const getRotatedBoundingBox = (element) => {
    // A full implementation would calculate the bounding box of a rotated element.
    // For now, we'll return the un-rotated box for simplicity.
    return {
        x: element.position.x,
        y: element.position.y,
        width: element.size.width,
        height: element.size.height
    };
};