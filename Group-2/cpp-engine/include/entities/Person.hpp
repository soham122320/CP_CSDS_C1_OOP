#pragma once
#include "core/Types.hpp"
namespace rescue {
class Person {
protected:
  int id_, cell_;

public:
  Person(int id, int cell) : id_(id), cell_(cell) {}
  virtual ~Person() = default;
  virtual std::string role() const = 0;
  int id() const { return id_; }
  int cell() const { return cell_; }
};

} // namespace rescue
