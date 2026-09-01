import { adaptIncident, adaptIncidents, relativeAge } from "./adaptIncident";

describe("adaptIncident", () => {
  const base = {
    id: 7,
    title: "Multi-car accident",
    description: "Two personal cars collided head on",
    status: "under-investigation",
    location_name: "Mombasa Road",
    latitude: -1.30334567890123,
    longitude: 36.8374123456789,
    author_id: "user-1",
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  };

  it("maps red-flag incidents onto the display shape", () => {
    const view = adaptIncident({ ...base, incident_type: "red-flag" });
    expect(view.type).toBe("🚩");
    expect(view.category).toBe("Red Flag");
    expect(view.location).toBe("Mombasa Road");
    expect(view.reporter).toBe("Citizen");
    expect(view.age).toBe("5 min ago");
    expect(view.latitude).toBe(-1.303346);
    expect(view.longitude).toBe(36.837412);
  });

  it("maps intervention incidents", () => {
    const view = adaptIncident({ ...base, incident_type: "intervention" });
    expect(view.type).toBe("⚠️");
    expect(view.category).toBe("Intervention");
  });

  it("marks sos alerts by keyword and anonymises the reporter", () => {
    const view = adaptIncident({
      ...base,
      incident_type: "sos",
      title: "SOS - Road Accident",
      author_id: null,
      status: "draft",
    });
    expect(view.type).toBe("🚗");
    expect(view.category).toBe("SOS Alert");
    expect(view.reporter).toBe("Anonymous · SOS");
    expect(view.status).toBe("pending");
  });

  it("still anonymises sos alerts when the API sends author: Anonymous", () => {
    const view = adaptIncident({
      ...base,
      incident_type: "sos",
      title: "SOS - Fire",
      author_id: null,
      author: "Anonymous",
    });
    expect(view.type).toBe("🔥");
    expect(view.reporter).toBe("Anonymous · SOS");
  });

  it("falls back to the generic sos emoji and a default location", () => {
    const view = adaptIncident({
      ...base,
      incident_type: "sos",
      title: "SOS alert",
      author_id: null,
      location_name: null,
    });
    expect(view.type).toBe("🚨");
    expect(view.location).toBe("Kenya");
  });

  it("uses the author username when the API provides one", () => {
    const view = adaptIncident({ ...base, incident_type: "intervention", author: "brian" });
    expect(view.reporter).toBe("brian");
  });

  it("leaves already display-shaped (mock) incidents intact", () => {
    const view = adaptIncident({
      id: "1",
      title: "Mock",
      type: "🚗",
      category: "Road accident",
      status: "resolved",
      location: "Nairobi",
      reporter: "Jane W.",
      age: "2 min ago",
    });
    expect(view.type).toBe("🚗");
    expect(view.category).toBe("Road accident");
    expect(view.reporter).toBe("Jane W.");
    expect(view.age).toBe("2 min ago");
  });

  it("returns falsy input unchanged", () => {
    expect(adaptIncident(null)).toBeNull();
    expect(adaptIncident(undefined)).toBeUndefined();
  });
});

describe("adaptIncidents", () => {
  it("adapts every item and tolerates an empty list", () => {
    expect(adaptIncidents()).toEqual([]);
    expect(adaptIncidents([{ incident_type: "intervention" }])).toHaveLength(1);
  });
});

describe("relativeAge", () => {
  it("describes recent timestamps in friendly units", () => {
    expect(relativeAge(null)).toBe("recently");
    expect(relativeAge(new Date(Date.now() - 30 * 1000).toISOString())).toBe("just now");
    expect(relativeAge(new Date(Date.now() - 12 * 60 * 1000).toISOString())).toBe("12 min ago");
    expect(relativeAge(new Date(Date.now() - 60 * 60 * 1000).toISOString())).toBe("1 hr ago");
    expect(relativeAge(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())).toBe("3 hrs ago");
    expect(relativeAge(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())).toBe("2 days ago");
  });
});
