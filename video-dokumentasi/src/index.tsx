import { registerRoot, Composition } from "remotion";
import { Video } from "./Video";
import { ReactNode } from "react";

const Root: React.FC = () => (
  <>
    <Composition
      id="VideoId"
      component={Video}
      durationInFrames={840}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ language: "id" }}
    />
    <Composition
      id="VideoEn"
      component={Video}
      durationInFrames={840}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ language: "en" }}
    />
  </>
);

registerRoot(Root);

export { Video };