#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 version"
    exit 1
fi

VERSION=$1

TAG=adhese/frontail:$VERSION

docker tag adhese/frontail:$VERSION $TAG 
docker push $TAG
