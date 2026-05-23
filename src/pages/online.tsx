
import PlaySnow from "src/components/play";
import Book from "src/components/book";
import DownloaderArea from "src/components/downloader";
import Player from "src/components/player";
import ShopPreview from "src/components/smallShop";

const Online = () => {
  return (
    <>
      <div className="snowOverview">
        <Player />
        <div className="duo">
          <div className="colmax">
            <Book />
            <div className="fil_empty_space"></div>
          </div>
          <ShopPreview />
        </div>
        <DownloaderArea />
      </div>

      <PlaySnow />
    </>
  );
};

export default Online;
