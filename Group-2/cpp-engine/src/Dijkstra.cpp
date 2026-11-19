#include "core/Engine.hpp"
#include <limits>
namespace rescue {
Path Dijkstra::calculate(const DisasterMap &map, int start, int destination) {
  Path result;
  result.calculated = true;
  if (!map.passable(start) || !map.passable(destination))
    return result;
  const int inf = std::numeric_limits<int>::max();
  std::vector<int> distance(Cells, inf), previous(Cells, -1);
  using Node = std::pair<int, int>;
  std::priority_queue<Node, std::vector<Node>, std::greater<Node>> queue;
  distance[start] = 0;
  queue.emplace(0, start);
  while (!queue.empty()) {
    auto [cost, cell] = queue.top();
    queue.pop();
    if (cost != distance[cell])
      continue;
    result.visited.push_back(cell);
    if (cell == destination)
      break;
    int row = cell / Cols, col = cell % Cols;
    const int dr[] = {-1, 0, 1, 0}, dc[] = {0, 1, 0, -1};
    for (int d = 0; d < 4; d++) {
      int r = row + dr[d], c = col + dc[d];
      if (r < 0 || r >= Rows || c < 0 || c >= Cols)
        continue;
      int next = r * Cols + c;
      if (!map.passable(next))
        continue;
      if (cost + 1 < distance[next]) {
        distance[next] = cost + 1;
        previous[next] = cell;
        queue.emplace(cost + 1, next);
      }
    }
  }
  if (distance[destination] == inf)
    return result;
  result.distance = distance[destination];
  for (int cell = destination; cell != -1; cell = previous[cell])
    result.route.push_back(cell);
  std::reverse(result.route.begin(), result.route.end());
  return result;
}
} // namespace rescue
