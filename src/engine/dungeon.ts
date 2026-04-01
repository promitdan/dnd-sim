import { Map } from 'rot-js';
import type { Tile, TileType } from '../components/types';

export const generateDungeon = (width: number, height: number): Tile[][] => {
    // 1. initialise every tile as a wall first
    const dungeon: Tile[][] = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({
            tileType: 'wall' as TileType,
            isExplored: false,
            isVisible: false,
            isStart: false,
        }))
    );

    // 2. use rot-js to carve out floors
    const digger = new Map.Digger(width, height,
        {
            roomWidth: [4, 8],
            roomHeight: [4, 8],
            corridorLength: [2, 6],
            dugPercentage: 0.7
        }
    );
    digger.create((x, y, value) => {
        // value 0 = floor, 1 = wall
        // your code here
         if (value === 0) {
            dungeon[y][x].tileType = 'floor';
        }
    });
    const rooms = digger.getRooms();
    const firstRoom = rooms[0];
    const [startX, startY] = firstRoom.getCenter();
    dungeon[startY][startX].isStart = true;
    return dungeon;
}