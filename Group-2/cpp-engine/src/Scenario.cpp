#include "core/Engine.hpp"
#include <set>
#include <stdexcept>
namespace rescue {
json Game::catalog() {
  json result = json::array();
  const char *names[] = {"First Response",       "Aftershock Avenue", "Critical Window",
                         "Floodline Evacuation", "Fuel Discipline",   "Blackout Corridor",
                         "The Last Mile"};
  const char *difficulties[] = {"Easy", "Easy", "Medium", "Medium", "Hard", "Hard", "Expert"};
  const char *briefs[] = {"Learn dispatch with two nearby civilians and generous resources.",
                          "Coordinate three rescues around earthquake debris.",
                          "Prioritize critical patients before the medical window closes.",
                          "Evacuate five people around a flooded central corridor.",
                          "Rescue six civilians with a reduced fuel reserve.",
                          "Extract critical casualties through a damaged road network.",
                          "Bring all eight civilians home under a tight deadline."};
  const std::vector<std::vector<int>> cells = {{79, 92},
                                               {53, 67, 81},
                                               {14, 35, 63, 88},
                                               {14, 35, 63, 88, 22},
                                               {14, 35, 63, 88, 22, 49},
                                               {14, 35, 63, 88, 22, 49, 79},
                                               {14, 35, 63, 88, 22, 49, 79, 101}};
  const int limits[] = {300, 240, 100, 180, 160, 90, 80}, fuels[] = {100, 100, 90, 90, 55, 65, 55};
  for (int i = 0; i < 7; i++) {
    json cs = json::array();
    for (int j = 0; j < int(cells[i].size()); j++)
      cs.push_back({{"cell", cells[i][j]}, {"severity", j % 3 == 0 ? 3 : j % 3 == 1 ? 2 : 1}});
    std::vector<int> blocked = i == 0 ? std::vector<int>{} : DisasterMap().blocked;
    if (i == 3 || i >= 5) {
      blocked.push_back(58);
      blocked.push_back(59);
      blocked.push_back(60);
    }
    result.push_back({{"id", i + 1},
                      {"name", names[i]},
                      {"difficulty", difficulties[i]},
                      {"brief", briefs[i]},
                      {"objective", i == 2 || i == 5 ? "critical" : "all"},
                      {"timeLimit", limits[i]},
                      {"fuel", fuels[i]},
                      {"supplies", 5},
                      {"blocked", blocked},
                      {"civilians", cs},
                      {"vehicles", {104, 106, 112, 116}},
                      {"hospitals", json::array({{{"cell", 2}, {"capacity", 4}},
                                                 {{"cell", 38}, {"capacity", 4}}})}});
  }
  return result;
}
void Game::configure(const json &input) {
  // Build and validate a complete candidate before touching the live manager.
  if (!input.is_object())
    throw std::runtime_error("Mission must be a JSON object.");
  auto integer = [&](const json &value, int low, int high) {
    if (!value.is_number_integer())
      throw std::runtime_error("Mission values must be whole numbers.");
    if (value < low || value > high)
      throw std::runtime_error("Mission value outside allowed range.");
    return value.get<int>();
  };
  std::string name = input.at("name").get<std::string>();
  if (name.empty() || name.size() > 64 ||
      std::any_of(name.begin(), name.end(), [](unsigned char c) { return c < 32; }))
    throw std::runtime_error("Use a mission name of 1–64 printable characters.");
  std::string objective = input.at("objective").get<std::string>();
  if (objective != "all" && objective != "critical")
    throw std::runtime_error("Unknown mission objective.");
  int limit = integer(input.at("timeLimit"), 30, 1200), fuel = integer(input.at("fuel"), 10, 100),
      kits = integer(input.at("supplies"), 1, 5);
  auto cs = input.at("civilians"), vs = input.at("vehicles"), hs = input.at("hospitals"),
       bs = input.at("blocked");
  if (!cs.is_array() || cs.empty() || cs.size() > 12 || !vs.is_array() || vs.size() != 4 ||
      !hs.is_array() || hs.size() != 2 || !bs.is_array() || bs.size() > 80)
    throw std::runtime_error(
        "Use 1–12 civilians, four vehicles and two hospitals (up to 80 blocked cells).");
  map.blocked.clear();
  std::set<int> occupied;
  for (auto b : bs) {
    int c = integer(b, 0, 116);
    if (!occupied.insert(c).second)
      throw std::runtime_error("Duplicate blocked cell.");
    map.blocked.push_back(c);
  }
  auto location = [&](const json &v) {
    int c = integer(v, 0, 116);
    if (!occupied.insert(c).second)
      throw std::runtime_error("Mission objects cannot overlap or occupy blocked cells.");
    return c;
  };
  vehicles.clear();
  civilians.clear();
  hospitals.clear();
  stations.clear();
  int beds = 0, critical = 0;
  for (int i = 0; i < 4; i++) {
    int cell = location(vs[i]);
    if (i == 0)
      vehicles.emplace_back(std::make_unique<Ambulance>(i, cell));
    if (i == 1)
      vehicles.emplace_back(std::make_unique<RescueVan>(i, cell));
    if (i == 2)
      vehicles.emplace_back(std::make_unique<FireTruck>(i, cell));
    if (i == 3)
      vehicles.emplace_back(std::make_unique<Helicopter>(i, cell));
    vehicles.back()->fuel = fuel;
    vehicles.back()->supplies = kits;
  }
  for (int i = 0; i < 2; i++) {
    int cell = location(hs[i].at("cell")), capacity = integer(hs[i].at("capacity"), 1, 12);
    hospitals.emplace_back(i, cell, i == 0 ? "Central General" : "Eastside Medical");
    hospitals.back().capacity = capacity;
    beds += capacity;
  }
  for (int i = 0; i < int(cs.size()); i++) {
    int cell = location(cs[i].at("cell")), severity = integer(cs[i].at("severity"), 1, 3);
    civilians.emplace_back(i, cell, severity, "Civilian " + std::to_string(i + 1));
    if (severity == 3)
      critical++;
  }
  if (objective == "critical" && !critical)
    throw std::runtime_error("A critical-care mission needs a critical civilian.");
  int goal = objective == "critical" ? critical : int(civilians.size());
  if (beds < goal || kits * 4 < goal)
    throw std::runtime_error("Not enough hospital beds or medical kits for the objective.");
  for (const auto &c : civilians) {
    if (objective == "critical" && c.severity != 3)
      continue;
    bool possible = false;
    for (const auto &v : vehicles)
      for (const auto &h : hospitals) {
        auto a = Dijkstra::calculate(map, v->cell, c.cell()),
             b = Dijkstra::calculate(map, c.cell(), h.cell());
        if (a.distance >= 0 && b.distance >= 0 &&
            (a.distance + b.distance) * v->fuelCost() <= fuel &&
            std::max(1, a.distance + b.distance) <= limit)
          possible = true;
      }
    if (!possible)
      throw std::runtime_error("An objective civilian has no feasible pickup and hospital route "
                               "within the fuel/time limits.");
  }
  scenario = {{"name", name},
              {"difficulty", "Custom"},
              {"brief", "A challenge created for a friend."},
              {"objective", objective},
              {"timeLimit", limit},
              {"fuel", fuel},
              {"supplies", kits},
              {"vehicles", vs},
              {"hospitals", hs},
              {"civilians", cs},
              {"blocked", map.blocked}};
  const std::string difficulty = input.value("difficulty", std::string("Custom"));
  if (difficulty == "Easy" || difficulty == "Medium" || difficulty == "Hard" ||
      difficulty == "Expert")
    scenario["difficulty"] = difficulty;
  timeLimit = limit;
  stations.emplace_back(2, vehicles[2]->cell, "Response base");
  events = json::array();
  notify("Mission loaded: " + name + ". " +
         (objective == "critical" ? "Rescue every critical civilian." : "Rescue every civilian."));
}
} // namespace rescue
