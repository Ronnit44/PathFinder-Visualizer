import React, { Component } from 'react';
import Node from './Node/Node';
import { dijkstra } from '../algorithms/dijkstra';
import { AStar } from '../algorithms/aStar';
import { dfs } from '../algorithms/dfs';
import { bfs } from '../algorithms/bfs';
import './PathfindingVisualizer.css';

export default class PathfindingVisualizer extends Component {
  constructor() {
    super();
    this.state = {
      grid: [],
      START_NODE_ROW: 5,
      FINISH_NODE_ROW: 5,
      START_NODE_COL: 5,
      FINISH_NODE_COL: 15,
      mouseIsPressed: false,
      isRunning: false,
      isStartNode: false,
      isFinishNode: false,
      isWallNode: false,
      currRow: 0,
      currCol: 0,
      isDesktopView: true,
      ROW_COUNT: 25,
      COLUMN_COUNT: 35,
      MOBILE_ROW_COUNT: 10,
      MOBILE_COLUMN_COUNT: 20,
    };
  }

  componentDidMount() {
    const grid = this.getInitialGrid();
    this.setState({ grid });
  }

  toggleIsRunning = () => {
    this.setState(prev => ({ isRunning: !prev.isRunning }));
  };

  toggleView = () => {
    const { isRunning, isDesktopView } = this.state;
    if (isRunning) return;

    this.clearGrid();
    this.clearWalls();

    const nextView = !isDesktopView;
    const rowCount = nextView ? this.state.ROW_COUNT : this.state.MOBILE_ROW_COUNT;
    const colCount = nextView ? this.state.COLUMN_COUNT : this.state.MOBILE_COLUMN_COUNT;

    if (
      this.state.START_NODE_ROW >= rowCount ||
      this.state.FINISH_NODE_ROW >= rowCount ||
      this.state.START_NODE_COL >= colCount ||
      this.state.FINISH_NODE_COL >= colCount
    ) {
      alert('Start & Finish Nodes must be within bounds!');
      return;
    }

    const grid = this.getInitialGrid(rowCount, colCount);
    this.setState({ isDesktopView: nextView, grid });
  };

  getInitialGrid = (rowCount = this.state.ROW_COUNT, colCount = this.state.COLUMN_COUNT) => {
    const grid = [];
    for (let row = 0; row < rowCount; row++) {
      const currentRow = [];
      for (let col = 0; col < colCount; col++) {
        currentRow.push(this.createNode(row, col));
      }
      grid.push(currentRow);
    }
    return grid;
  };

  createNode = (row, col) => {
    return {
      row,
      col,
      isStart: row === this.state.START_NODE_ROW && col === this.state.START_NODE_COL,
      isFinish: row === this.state.FINISH_NODE_ROW && col === this.state.FINISH_NODE_COL,
      distance: Infinity,
      distanceToFinishNode: Math.abs(this.state.FINISH_NODE_ROW - row) + Math.abs(this.state.FINISH_NODE_COL - col),
      isVisited: false,
      isWall: false,
      previousNode: null,
      isNode: true,
    };
  };

  isGridClear = () => {
    return this.state.grid.every(row =>
      row.every(node => {
        const className = document.getElementById(`node-${node.row}-${node.col}`)?.className;
        return !(className === 'node node-visited' || className === 'node node-shortest-path');
      })
    );
  };

  handleMouseDown = (row, col) => {
    if (this.state.isRunning) return;

    const className = document.getElementById(`node-${row}-${col}`)?.className;

    if (!this.isGridClear()) {
      this.clearGrid();
      return;
    }

    if (className === 'node node-start') {
      this.setState({ mouseIsPressed: true, isStartNode: true, currRow: row, currCol: col });
    } else if (className === 'node node-finish') {
      this.setState({ mouseIsPressed: true, isFinishNode: true, currRow: row, currCol: col });
    } else {
      const newGrid = getNewGridWithWallToggled(this.state.grid, row, col);
      this.setState({ grid: newGrid, mouseIsPressed: true, isWallNode: true });
    }
  };

  handleMouseEnter = (row, col) => {
    if (this.state.isRunning || !this.state.mouseIsPressed) return;

    const className = document.getElementById(`node-${row}-${col}`)?.className;

    if (this.state.isStartNode && className !== 'node node-wall') {
      this.updateStartOrFinishNode('START', row, col);
    } else if (this.state.isFinishNode && className !== 'node node-wall') {
      this.updateStartOrFinishNode('FINISH', row, col);
    } else if (this.state.isWallNode) {
      const newGrid = getNewGridWithWallToggled(this.state.grid, row, col);
      this.setState({ grid: newGrid });
    }
  };

  handleMouseUp = (row, col) => {
    if (!this.state.isRunning) {
      this.setState({
        mouseIsPressed: false,
        isStartNode: false,
        isFinishNode: false,
        isWallNode: false,
      });
    }
  };

  handleMouseLeave = () => {
    this.setState({ mouseIsPressed: false, isStartNode: false, isFinishNode: false, isWallNode: false });
  };

  updateStartOrFinishNode = (type, row, col) => {
    const grid = this.state.grid.slice();
    const prevRow = this.state.currRow;
    const prevCol = this.state.currCol;

    grid[prevRow][prevCol][`is${type}`] = false;
    grid[row][col][`is${type}`] = true;

    document.getElementById(`node-${prevRow}-${prevCol}`).className = 'node';
    document.getElementById(`node-${row}-${col}`).className = `node node-${type.toLowerCase()}`;

    this.setState({
      grid,
      currRow: row,
      currCol: col,
      [`${type}_NODE_ROW`]: row,
      [`${type}_NODE_COL`]: col,
    });
  };

  clearGrid = () => {
    const grid = this.state.grid.map(row =>
      row.map(node => {
        const nodeClass = document.getElementById(`node-${node.row}-${node.col}`)?.className;
        if (
          nodeClass !== 'node node-start' &&
          nodeClass !== 'node node-finish' &&
          nodeClass !== 'node node-wall'
        ) {
          document.getElementById(`node-${node.row}-${node.col}`).className = 'node';
        }

        return {
          ...node,
          isVisited: false,
          distance: Infinity,
          distanceToFinishNode: Math.abs(this.state.FINISH_NODE_ROW - node.row) + Math.abs(this.state.FINISH_NODE_COL - node.col),
          previousNode: null,
        };
      })
    );
    this.setState({ grid });
  };

  clearWalls = () => {
    const grid = this.state.grid.map(row =>
      row.map(node => {
        const className = document.getElementById(`node-${node.row}-${node.col}`)?.className;
        if (className === 'node node-wall') {
          document.getElementById(`node-${node.row}-${node.col}`).className = 'node';
          return { ...node, isWall: false };
        }
        return node;
      })
    );
    this.setState({ grid });
  };

  visualize = (algo) => {
    if (this.state.isRunning) return;
    this.clearGrid();
    this.toggleIsRunning();

    const { grid, START_NODE_ROW, START_NODE_COL, FINISH_NODE_ROW, FINISH_NODE_COL } = this.state;
    const startNode = grid[START_NODE_ROW][START_NODE_COL];
    const finishNode = grid[FINISH_NODE_ROW][FINISH_NODE_COL];

    let visitedNodesInOrder = [];
    switch (algo) {
      case 'Dijkstra':
        visitedNodesInOrder = dijkstra(grid, startNode, finishNode);
        break;
      case 'AStar':
        visitedNodesInOrder = AStar(grid, startNode, finishNode);
        break;
      case 'BFS':
        visitedNodesInOrder = bfs(grid, startNode, finishNode);
        break;
      case 'DFS':
        visitedNodesInOrder = dfs(grid, startNode, finishNode);
        break;
      default:
        return;
    }

    const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
    this.animate(visitedNodesInOrder, nodesInShortestPathOrder);
  };

  animate = (visitedNodesInOrder, nodesInShortestPathOrder) => {
    for (let i = 0; i <= visitedNodesInOrder.length; i++) {
      if (i === visitedNodesInOrder.length) {
        setTimeout(() => this.animateShortestPath(nodesInShortestPathOrder), 10 * i);
        return;
      }
      setTimeout(() => {
        const node = visitedNodesInOrder[i];
        const className = document.getElementById(`node-${node.row}-${node.col}`)?.className;
        if (className !== 'node node-start' && className !== 'node node-finish') {
          document.getElementById(`node-${node.row}-${node.col}`).className = 'node node-visited';
        }
      }, 10 * i);
    }
  };

  animateShortestPath = (nodesInShortestPathOrder) => {
    for (let i = 0; i < nodesInShortestPathOrder.length; i++) {
      setTimeout(() => {
        const node = nodesInShortestPathOrder[i];
        const className = document.getElementById(`node-${node.row}-${node.col}`)?.className;
        if (className !== 'node node-start' && className !== 'node node-finish') {
          document.getElementById(`node-${node.row}-${node.col}`).className = 'node node-shortest-path';
        }
        if (i === nodesInShortestPathOrder.length - 1) {
          this.toggleIsRunning();
        }
      }, 40 * i);
    }
  };

  render() {
    const { grid, mouseIsPressed, isDesktopView } = this.state;
    return (
      <div>
        <nav className="navbar navbar-dark bg-dark">
          <span className="navbar-brand"><b>PathFinding Visualizer</b></span>
        </nav>

        <table className="grid-container" onMouseLeave={this.handleMouseLeave}>
          <tbody>
            {grid.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((node, nodeIdx) => {
                  const { row, col, isFinish, isStart, isWall } = node;
                  return (
                    <Node
                      key={nodeIdx}
                      col={col}
                      isFinish={isFinish}
                      isStart={isStart}
                      isWall={isWall}
                      mouseIsPressed={mouseIsPressed}
                      onMouseDown={this.handleMouseDown}
                      onMouseEnter={this.handleMouseEnter}
                      onMouseUp={this.handleMouseUp}
                      row={row}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="controls">
          <button className="btn btn-danger" onClick={this.clearGrid}>Clear Grid</button>
          <button className="btn btn-warning" onClick={this.clearWalls}>Clear Walls</button>
          <button className="btn btn-primary" onClick={() => this.visualize('Dijkstra')}>Dijkstra's</button>
          <button className="btn btn-success" onClick={() => this.visualize('AStar')}>A*</button>
          <button className="btn btn-primary" onClick={() => this.visualize('BFS')}>BFS</button>
          <button className="btn btn-info" onClick={() => this.visualize('DFS')}>DFS</button>
          <button
            className={`btn ${isDesktopView ? 'btn-light' : 'btn-dark'}`}
            onClick={this.toggleView}>
            {isDesktopView ? 'Mobile View' : 'Desktop View'}
          </button>
        </div>;
      </div>
    );
  }
}

const getNewGridWithWallToggled = (grid, row, col) => {
  const newGrid = grid.slice();
  const node = newGrid[row][col];
  if (!node.isStart && !node.isFinish) {
    const newNode = { ...node, isWall: !node.isWall };
    newGrid[row][col] = newNode;
  }
  return newGrid;
};

// Backtracking for shortest path
const getNodesInShortestPathOrder = (finishNode) => {
  const nodesInShortestPathOrder = [];
  let currentNode = finishNode;
  while (currentNode) {
    nodesInShortestPathOrder.unshift(currentNode);
    currentNode = currentNode.previousNode;
  }
  return nodesInShortestPathOrder;
};
