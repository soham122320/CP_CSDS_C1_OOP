#pragma once
#include "algorithms/Dijkstra.hpp"
#include "entities/Civilian.hpp"
#include "facilities/FireStation.hpp"
#include "facilities/Hospital.hpp"
#include "managers/RescueManager.hpp"
#include "managers/ScoreManager.hpp"
#include "vehicles/Vehicle.hpp"
namespace rescue {
class Game {
public:
  DisasterMap map;
  Phase phase = Phase::Ready;
  int ticks = 0, selected = 0;
  std::vector<std::unique_ptr<Vehicle>> vehicles;
  std::vector<Civilian> civilians;
  std::vector<Hospital> hospitals;
  std::vector<FireStation> stations;
  ScoreManager score;
  json missions = json::array(), events = json::array(), history = json::array();
  Path lastPath;
  Game();
  static json catalog();
  void configure(const json &);
  json scenario = {
      {"name", "Operation Ground Zero"}, {"difficulty", "Classic"}, {"objective", "all"}};
  int timeLimit = 600;
  std::string outcome = "pending";
  void start();
  void pause();
  void tick();
  void moveVehicle(int);
  void selectVehicle(int);
  void assign(int, int);
  Path calculate(int, int);
  json state() const;
  void notify(std::string, std::string = "info");

private:
  Vehicle &vehicle(int);
  Civilian &civilian(int);
  void advance(Vehicle &);
  void finishCheck();
};

} // namespace rescue
