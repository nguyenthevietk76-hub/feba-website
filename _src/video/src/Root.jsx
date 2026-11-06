import React from 'react';
import { Composition } from 'remotion';
import { Intro, DURATION, FPS } from './Intro';

export const Root = () => (
  <>
    <Composition id="FebaIntro" component={Intro} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="FebaIntroVertical" component={Intro} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
  </>
);
