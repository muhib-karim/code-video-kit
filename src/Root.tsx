import React from 'react';
import { Composition } from 'remotion';
import type { AnyZodObject } from 'zod';
import { registry } from './registry';

// The registry mixes 34 different prop types. <Composition> is generic over a
// single schema/props pair, so we use a deliberately loose view of it here;
// each entry's schema still validates its props at runtime in the Studio.
const LooseComposition = Composition as unknown as React.FC<{
  id: string;
  component: React.ComponentType<any>;
  schema: AnyZodObject;
  defaultProps: Record<string, unknown>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}>;

/** Registers one composition per registry entry. */
export const RemotionRoot: React.FC = () => (
  <>
    {registry.map((entry) => (
      <LooseComposition
        key={entry.id}
        id={entry.id}
        component={entry.component}
        schema={entry.schema}
        defaultProps={entry.defaultProps}
        durationInFrames={entry.durationInFrames}
        fps={entry.fps}
        width={entry.width}
        height={entry.height}
      />
    ))}
  </>
);
