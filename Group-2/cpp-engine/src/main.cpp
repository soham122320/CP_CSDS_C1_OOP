#include "core/Engine.hpp"
#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
using namespace emscripten;
rescue::GameManager manager;
std::string initializeGame() {
  manager = rescue::GameManager();
  return manager.state().dump();
}
std::string getGameState() {
  return manager.state().dump();
}
std::string startGame() {
  return manager.command("start").dump();
}
std::string pauseGame() {
  return manager.command("pause").dump();
}
std::string restartGame() {
  manager.restart();
  return manager.state().dump();
}
std::string tick() {
  return manager.command("tick").dump();
}
std::string getVehicles() {
  return manager.state()["vehicles"].dump();
}
std::string getCivilians() {
  return manager.state()["civilians"].dump();
}
std::string getFacilities() {
  return manager.state()["facilities"].dump();
}
std::string selectVehicle(int id) {
  return manager.command("select", id).dump();
}
std::string assignRescueMission(int v, int c) {
  return manager.command("assign", v, c).dump();
}
std::string calculateShortestPath(int a, int b) {
  return manager.command("path", a, b).dump();
}
std::string moveVehicle(int id) {
  return manager.command("move", id).dump();
}
int getCurrentScore() {
  return manager.score();
}
std::string saveGame() {
  return manager.save();
}
std::string loadGame(std::string text) {
  manager.load(text);
  return getGameState();
}
std::string validateScenario(std::string text) {
  rescue::GameManager candidate;
  candidate.setScenario(text);
  return candidate.exportScenario();
}
std::string getScenarios() {
  return rescue::Game::catalog().dump();
}
std::string setScenario(std::string text) {
  manager.setScenario(text);
  return getGameState();
}
std::string exportScenario() {
  return manager.exportScenario();
}
EMSCRIPTEN_BINDINGS(rescue_engine) {
  function("validateScenario", &validateScenario);
  function("getScenarios", &getScenarios);
  function("setScenario", &setScenario);
  function("exportScenario", &exportScenario);
  function("initializeGame", &initializeGame);
  function("getGameState", &getGameState);
  function("startGame", &startGame);
  function("pauseGame", &pauseGame);
  function("restartGame", &restartGame);
  function("tick", &tick);
  function("getVehicles", &getVehicles);
  function("getCivilians", &getCivilians);
  function("getFacilities", &getFacilities);
  function("selectVehicle", &selectVehicle);
  function("assignRescueMission", &assignRescueMission);
  function("calculateShortestPath", &calculateShortestPath);
  function("moveVehicle", &moveVehicle);
  function("getCurrentScore", &getCurrentScore);
  function("saveGame", &saveGame);
  function("loadGame", &loadGame);
}
#endif
