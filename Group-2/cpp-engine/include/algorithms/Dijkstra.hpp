#pragma once
#include "map/DisasterMap.hpp"
namespace rescue {
struct Path {
  std::vector<int> route, visited;
  int distance = -1;
  bool calculated = false;
  json state() const {
    return {
        {"route", route}, {"visited", visited}, {"distance", distance}, {"calculated", calculated}};
  }
};
class Dijkstra {
public:
  static Path calculate(const DisasterMap &, int, int);
};

} // namespace rescue
