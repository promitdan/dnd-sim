import './GameArea.css';

const GameArea = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="game-area">
      {children}
    </div>
    )
}
export default GameArea;