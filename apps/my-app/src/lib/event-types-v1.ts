export interface BaseEvent {
  type: string;
}

export interface IncrementCountEvent extends BaseEvent {
  type: "INCREMENT_COUNT";
}

export interface SetMessageEvent extends BaseEvent {
  type: "SET_MESSAGE";
  payload: {
    message: string;
  };
}
