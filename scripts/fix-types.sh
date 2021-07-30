#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

function fix() {
  TYPES=$1
  sed -i '' '/constructor:/d' $TYPES
  sed -i '' 's/: any/: unknown/g' $TYPES
  sed -i '' 's/: Function/: (...args: Array<unknown>) => unknown/g' $TYPES
  sed -i '' 's/=> any/=> unknown/g' $TYPES
  sed -i '' 's/=> object/=> Record<string, unknown>/g' $TYPES
  sed -i '' 's/^declare var/declare const/' $TYPES
  sed -i '' 's/^declare/export declare/' $TYPES
  sed -i '' 's/^type/export type/' $TYPES
}

fix "${SCRIPT_DIR}/../dist/word/apiBuilder.d.ts"
fix "${SCRIPT_DIR}/../dist/common/plugins/plugin_base_api.d.ts"

# delete some useless private stuff
# for help with this regex, check out this: https://stackoverflow.com/questions/6287755/using-sed-to-delete-all-lines-between-two-matching-patterns
sed -i '' '/function private_GetDrawingDocument/,/class Api/{/class Api/!d;}' $TYPES
sed -i '' '/function private_RemoveEmptyRanges/,/private_RefreshRangesPosition/d' $TYPES
