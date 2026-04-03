import GameArea from "./components/GameArea";
import PlayableArea from "./components/PlayableArea";
import MuteButton from "./components/MuteButton";
import './App.css';
const App = () => {
  return (
    <div className="App">
      <MuteButton />
      <GameArea>
        <div className="game-title">The Dungeon of Evil</div>
        <PlayableArea />
      </GameArea>
    </div>
  )
}
export default App;