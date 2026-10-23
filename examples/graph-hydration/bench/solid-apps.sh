# Measures the hydration of each example app of the experiment branch.
# Each spec: <example> <port> <path>.
BENCH=$(cd "$(dirname "$0")" && pwd)
cd "$BENCH/../.."
IFS="," read -ra LIST <<< "${APPS:-board 3011 /,chat 3009 /,hackernews 3004 /,notes 3006 /,todos-server 3010 /todos,server-dbmon 3020 /}"
for spec in "${LIST[@]}"; do
  set -- $spec
  (cd $1 && PORT=$2 node server.js > /tmp/zz-srv-$1.log 2>&1 &)
  for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:$2/ && break; sleep 0.25; done
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$2$3)
  if [ "$code" = 200 ]; then node "$BENCH/solid-app.mjs" "$1 $3" "http://localhost:$2$3" 5; else echo "$1 $3: status $code"; tail -3 /tmp/zz-srv-$1.log; fi
  kill $(lsof -ti tcp:$2) 2>/dev/null
done
