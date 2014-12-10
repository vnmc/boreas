#!/bin/bash

for f in test-*.js
do
   echo "Testing $f..."
   mocha $f
done
