/** The demo's shared contract: imported by both the host page and the widget. */
export type DemoContract = {
  host: {
    events: { theme: 'light' | 'dark' };
    methods: { getUser: () => { name: string } };
  };
  frame: {
    events: { booked: { slot: string } };
    methods: Record<string, never>;
  };
};
