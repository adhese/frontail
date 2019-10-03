#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 version"
    exit 1
fi

VERSION=$1

docker build -t adhese/frontail:$VERSION .
