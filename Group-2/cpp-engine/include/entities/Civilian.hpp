#pragma once
#include "entities/Person.hpp"
namespace rescue {
class Civilian : public Person {
public:
  int severity;
  std::string name, status = "waiting";
  Civilian(int id, int cell, int severity, std::string name)
      : Person(id, cell), severity(severity), name(std::move(name)) {}
  std::string role() const override { return "Civilian"; }
  json state() const;
  bool operator<(const Civilian &other) const { return severity < other.severity; }
};

} // namespace rescue
