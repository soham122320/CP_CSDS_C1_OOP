#include "core/Engine.hpp"
namespace rescue {
json Civilian::state() const {
  return {{"id", id_}, {"cell", cell_}, {"name", name}, {"severity", severity}, {"status", status}};
}
json Vehicle::state() const {
  return {{"id", id_},
          {"type", type_},
          {"cell", cell},
          {"fuel", fuel},
          {"supplies", supplies},
          {"status", status},
          {"civilianId", civilian},
          {"hospitalId", hospital},
          {"route", route},
          {"routeIndex", routeIndex},
          {"fuelCost", fuelCost()}};
}
json Hospital::state() const {
  return {{"id", id_},           {"cell", cell_},        {"name", name_},
          {"type", "hospital"},  {"capacity", capacity}, {"occupied", occupied},
          {"reserved", reserved}};
}
json FireStation::state() const {
  return {{"id", id_}, {"cell", cell_}, {"name", name_}, {"type", "station"}};
}
std::vector<int> RescueManager::priorities(const std::vector<Civilian> &civilians) {
  std::priority_queue<std::pair<int, int>> queue;
  for (const auto &c : civilians)
    if (c.status == "waiting")
      queue.emplace(c.severity, -c.id());
  std::vector<int> result;
  while (!queue.empty()) {
    result.push_back(-queue.top().second);
    queue.pop();
  }
  return result;
}
} // namespace rescue
