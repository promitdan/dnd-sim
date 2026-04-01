import GameArea from "./components/GameArea";
import PlayableArea from "./components/PlayableArea";

const App = () => {
  return (
    <div className="App">
      <GameArea>
        <div className="game-title">The Dungeon of Evil</div>
        <PlayableArea />
      </GameArea>
    </div>
  )
}
export default App;