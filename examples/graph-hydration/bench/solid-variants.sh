# Builds and measures each variant of the experiment app.
APP=~/Documents/GitHub/solid-graph/examples/graph-hydration
H=/Users/alexis/Documents/GitHub/brumate/benchmarks/harness
IFS="," read -ra LIST <<< "${VARIANTS:-50 0 0,50 2000 0,200 0 0,200 2000 0}"
for v in "${LIST[@]}"; do
  set -- $v
  kill $(lsof -ti tcp:3040) 2>/dev/null
  (cd $APP && WIDGETS=$1 WORK=$2 ASYNC=$3 npx vite build >/dev/null 2>&1)
  (cd $APP && GRAPH=${4:-0} GRAPH_MIN_MS=${5:-0} node server.js >/dev/null 2>&1 &)
  for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3040/ && break; sleep 0.2; done
  (node $(dirname $0)/solid-measure.mjs "$1 widgets, work $2, async $3, graph ${4:-0} min ${5:-0}, html $(curl -s http://localhost:3040/ | wc -c | tr -d " ") B, br $(curl -s -H "Accept-Encoding: br" http://localhost:3040/ | wc -c | tr -d " ") B" 9)
done
kill $(lsof -ti tcp:3040) 2>/dev/null
