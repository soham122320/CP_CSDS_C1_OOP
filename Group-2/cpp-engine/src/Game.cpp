#include "core/Engine.hpp"
#include <stdexcept>
namespace rescue {
Game::Game() {
  vehicles.emplace_back(std::make_unique<Ambulance>(0, 104));
  vehicles.emplace_back(std::make_unique<RescueVan>(1, 106));
  vehicles.emplace_back(std::make_unique<FireTruck>(2, 112));
  vehicles.emplace_back(std::make_unique<Helicopter>(3, 116));
  civilians = {{0, 14, 3, "Aarav Shah"}, {1, 35, 3, "Mira Patel"}, {2, 63, 2, "Dev Mehta"},
               {3, 88, 3, "Anaya Rao"},  {4, 22, 2, "Rohan Das"},  {5, 49, 1, "Isha Roy"},
               {6, 79, 2, "Kabir Jain"}, {7, 101, 1, "Zoya Khan"}};
  hospitals.emplace_back(0, 2, "Central General");
  hospitals.emplace_back(1, 38, "Eastside Medical");
  stations.emplace_back(2, 112, "Station 04");
  notify("Command centre online. Select a unit and assign a rescue.");
  history.push_back({{"tick", 0}, {"rescued", 0}, {"score", 0}});
}
void Game::notify(std::string text, std::string kind) {
  events.insert(events.begin(), json{{"text", text}, {"kind", kind}, {"tick", ticks}});
  if (events.size() > 30)
    events.erase(events.end() - 1);
}
Vehicle &Game::vehicle(int id) {
  if (id < 0 || id >= int(vehicles.size()))
    throw std::runtime_error("Unknown vehicle");
  return *vehicles[id];
}
Civilian &Game::civilian(int id) {
  if (id < 0 || id >= int(civilians.size()))
    throw std::runtime_error("Unknown civilian");
  return civilians[id];
}
void Game::start() {
  if (phase == Phase::Finished)
    throw std::runtime_error("Operation ended. Start a new operation.");
  phase = Phase::Running;
}
void Game::pause() {
  if (phase == Phase::Running)
    phase = Phase::Paused;
}
void Game::selectVehicle(int id) {
  vehicle(id);
  selected = id;
}
Path Game::calculate(int start, int end) {
  lastPath = Dijkstra::calculate(map, start, end);
  return lastPath;
}
void Game::assign(int vid, int cid) {
  if (phase != Phase::Running)
    throw std::runtime_error("Start or resume the simulation first.");
  auto &v = vehicle(vid);
  auto &c = civilian(cid);
  if (v.status != "available")
    throw std::runtime_error("This unit already has a mission.");
  if (c.status != "waiting")
    throw std::runtime_error("This civilian already has a rescue unit.");
  if (v.supplies < 1)
    throw std::runtime_error("Unit has no medical supplies.");
  auto pickup = Dijkstra::calculate(map, v.cell, c.cell());
  int best = -1, bestDistance = 10000;
  Path delivery;
  for (int i = 0; i < int(hospitals.size()); ++i)
    if (hospitals[i].available()) {
      auto p = Dijkstra::calculate(map, c.cell(), hospitals[i].cell());
      if (p.distance >= 0 && p.distance < bestDistance) {
        best = i;
        bestDistance = p.distance;
        delivery = p;
      }
    }
  if (best < 0)
    throw std::runtime_error("No hospital beds available.");
  if (pickup.distance < 0)
    throw std::runtime_error("Civilian is unreachable.");
  if ((pickup.distance + delivery.distance) * v.fuelCost() > v.fuel)
    throw std::runtime_error("Insufficient fuel for pickup and hospital delivery.");
  v.route = pickup.route;
  v.route.insert(v.route.end(), delivery.route.begin() + 1, delivery.route.end());
  v.routeIndex = 0;
  v.civilian = cid;
  v.hospital = best;
  v.status = "responding";
  c.status = "assigned";
  hospitals[best].reserved++;
  lastPath = pickup;
  lastPath.route = v.route;
  lastPath.distance = int(v.route.size()) - 1;
  missions.push_back({{"id", missions.size() + 1},
                      {"vehicleId", vid},
                      {"civilianId", cid},
                      {"hospitalId", best},
                      {"status", "responding"},
                      {"started", ticks},
                      {"completed", nullptr}});
  notify("Unit 0" + std::to_string(vid + 1) + " dispatched to " + c.name, "dispatch");
  if (v.cell == c.cell()) {
    c.status = "onboard";
    v.status = "transporting";
    v.supplies--;
    missions.back()["status"] = "transporting";
  }
}
void Game::advance(Vehicle &v) {
  if (v.status == "available")
    return;
  if (v.routeIndex + 1 < int(v.route.size())) {
    v.cell = v.route[++v.routeIndex];
    v.fuel -= v.fuelCost();
  }
  auto &c = civilian(v.civilian);
  if (v.status == "responding" && v.cell == c.cell()) {
    v.status = "transporting";
    c.status = "onboard";
    v.supplies--;
    notify(c.name + " secured. Transporting to hospital.", "success");
    for (auto &m : missions)
      if (m["civilianId"] == c.id())
        m["status"] = "transporting";
  }
  if (v.routeIndex + 1 == int(v.route.size())) {
    auto &h = hospitals[v.hospital];
    h.reserved--;
    h.occupied++;
    c.status = "rescued";
    score.rescue(c.severity, v.rewardBonus());
    for (auto &m : missions)
      if (m["civilianId"] == c.id()) {
        m["status"] = "completed";
        m["completed"] = ticks;
      }
    notify(c.name + " safely delivered. +" + std::to_string(c.severity * 100 + v.rewardBonus()) +
               " points",
           "success");
    v.status = "available";
    v.civilian = -1;
    v.hospital = -1;
    v.route.clear();
    v.routeIndex = 0;
  }
}
void Game::finishCheck() {
  bool all = std::all_of(civilians.begin(), civilians.end(), [&](const auto &c) {
    return c.status == "rescued" || (scenario["objective"] == "critical" && c.severity != 3);
  });
  bool active = std::any_of(vehicles.begin(), vehicles.end(),
                            [](const auto &v) { return v->status != "available"; });
  bool possible = false;
  for (const auto &v : vehicles)
    if (v->status == "available" && v->supplies > 0)
      for (const auto &c : civilians)
        if (c.status == "waiting" && (scenario["objective"] != "critical" || c.severity == 3))
          for (const auto &h : hospitals)
            if (h.available()) {
              auto a = Dijkstra::calculate(map, v->cell, c.cell()),
                   b = Dijkstra::calculate(map, c.cell(), h.cell());
              if (a.distance >= 0 && b.distance >= 0 &&
                  (a.distance + b.distance) * v->fuelCost() <= v->fuel)
                possible = true;
            }
  if (all || ticks >= timeLimit || (!active && !possible)) {
    phase = Phase::Finished;
    outcome = all ? "success" : "failure";
    notify(all ? "Mission complete. All rescue objectives achieved."
               : "Operation ended. Review your results.",
           all ? "success" : "warning");
  }
}
void Game::tick() {
  if (phase != Phase::Running)
    return;
  ++ticks;
  for (auto &v : vehicles)
    advance(*v);
  finishCheck();
  int rescued = std::count_if(civilians.begin(), civilians.end(),
                              [](const auto &c) { return c.status == "rescued"; });
  history.push_back({{"tick", ticks}, {"rescued", rescued}, {"score", score.value()}});
}
void Game::moveVehicle(int id) {
  if (phase != Phase::Running)
    throw std::runtime_error("Simulation is not running");
  vehicle(id);
  ++ticks;
  advance(vehicle(id));
  finishCheck();
}
json Game::state() const {
  json vs = json::array(), cs = json::array(), fs = json::array();
  int rescued = 0, critical = 0, active = 0;
  for (const auto &v : vehicles) {
    vs.push_back(v->state());
    if (v->status != "available")
      active++;
  }
  for (const auto &c : civilians) {
    cs.push_back(c.state());
    if (c.status == "rescued")
      rescued++;
    else if (c.severity == 3)
      critical++;
  }
  for (const auto &h : hospitals)
    fs.push_back(h.state());
  for (const auto &f : stations)
    fs.push_back(f.state());
  const char *phases[] = {"ready", "running", "paused", "finished"};
  return {{"phase", phases[int(phase)]},
          {"ticks", ticks},
          {"timeRemaining", timeLimit - ticks},
          {"timeLimit", timeLimit},
          {"scenario", scenario},
          {"outcome", outcome},
          {"selectedVehicle", selected},
          {"score", score.value()},
          {"rescued", rescued},
          {"critical", critical},
          {"activeMissions", active},
          {"total", civilians.size()},
          {"vehicles", vs},
          {"civilians", cs},
          {"facilities", fs},
          {"map", map.state()},
          {"missions", missions},
          {"events", events},
          {"history", history},
          {"path", lastPath.state()},
          {"priorities", RescueManager::priorities(civilians)}};
}
} // namespace rescue
