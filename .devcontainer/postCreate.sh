#!/usr/bin/env bash
npm i -g npm 
npm i -g pnpm
pnpm install
npm i -g ts-node typescript '@types/node'
npm i firebase-tools -g
firebase setup:emulators:firestore
firebase setup:emulators:ui