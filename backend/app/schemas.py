from marshmallow import Schema, fields, validate, ValidationError


class UserRegisterSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))


class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class UserProfileUpdateSchema(Schema):
    age = fields.Integer(load_default=None, allow_none=True)
    education_group = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=50))
    grade_level = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))
    onboarding_completed = fields.Boolean(load_default=False)


class CourseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.String(required=True)
    description = fields.String()
    level = fields.String()
    teacher_id = fields.Int()
    created_at = fields.DateTime(dump_only=True)


class LessonSchema(Schema):
    id = fields.Int(dump_only=True)
    course_id = fields.Int(required=True)
    title = fields.String(required=True)
    content = fields.String()
    order = fields.Int()
    video_url = fields.String(allow_none=True)


class QuizSchema(Schema):
    id = fields.Int(dump_only=True)
    course_id = fields.Int(required=True)
    title = fields.String(required=True)


class QuestionSchema(Schema):
    id = fields.Int(dump_only=True)
    quiz_id = fields.Int(required=True)
    text = fields.String(required=True)
    type = fields.String()
    options = fields.List(fields.String())
    correct_answer = fields.String(required=True)


class ProgressSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    course_id = fields.Int(required=True)
    lesson_id = fields.Int(allow_none=True)
    completed = fields.Boolean()


class QuizAttemptSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    quiz_id = fields.Int(required=True)
    answers = fields.List(fields.Dict(), required=True)